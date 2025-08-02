from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import os
import asyncio
from agent import (
    get_job_description, extract_info, edit_technical_skills, 
    edit_experience, edit_projects, compile_resume, 
    judge_resume_quality, decide_after_judging, AgentState
)

app = FastAPI(
    title="Resume Forge API",
    description="AI-powered resume tailoring service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class JobDescriptionRequest(BaseModel):
    jobDescription: str
    
class CompanyPositionResponse(BaseModel):
    companyName: str
    position: str
    
class ResumeUpdateResponse(BaseModel):
    tailoredResume: str
    success: bool
    message: str
    
class QualityScoreResponse(BaseModel):
    score: float
    feedback: str
    downsides: str
    iterationCount: int
    
class CompileResponse(BaseModel):
    pdfPath: Optional[str]
    success: bool
    message: str
    
class WorkflowResponse(BaseModel):
    success: bool
    finalScore: float
    pdfPath: Optional[str]
    iterationCount: int
    message: str

class ResumeParseResponse(BaseModel):
    success: bool
    resumeData: Dict[str, Any]
    message: str

class ResumeUpdateRequest(BaseModel):
    resumeData: Dict[str, Any]

class ResumeUpdateResponse(BaseModel):
    success: bool
    message: str

# Global state storage (in production, use Redis or database)
workflowStates: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def rootEndpoint():
    """Health check endpoint"""
    return {"message": "Resume Forge API is running", "status": "healthy"}

@app.get("/parseResume", response_model=ResumeParseResponse)
async def parseResumeEndpoint():
    """Parse the resume template and return structured JSON data"""
    try:
        from agent import get_resume_content
        import re
        from latex_parser import parseWorkExperience, parseProjects, parseCertifications, extractResumeItems, cleanLatexText
        
        resumeContent = get_resume_content()
        
        resumeData = {
            "personalInfo": {},
            "technicalSkills": "",
            "workExperience": [],
            "projects": [],
            "education": "",
            "certifications": [],
            "invisibleKeywords": "",
            "rawContent": resumeContent
        }
        

        nameMatch = re.search(r'\\huge \\scshape ([^}]+)\}', resumeContent)
        if nameMatch:
            resumeData["personalInfo"]["name"] = nameMatch.group(1).strip()
            
        phoneMatch = re.search(r'\\faPhone\\\s+([^~]+)~', resumeContent)
        if phoneMatch:
            resumeData["personalInfo"]["phone"] = phoneMatch.group(1).strip()
            
        emailMatch = re.search(r'\\href\{mailto:([^}]+)\}', resumeContent)
        if emailMatch:
            resumeData["personalInfo"]["email"] = emailMatch.group(1).strip()
            
        linkedinMatch = re.search(r'\\href\{https://www\.linkedin\.com/in/([^}]+)\}', resumeContent)
        if linkedinMatch:
            resumeData["personalInfo"]["linkedin"] = f"linkedin.com/in/{linkedinMatch.group(1).strip()}"
            
        githubMatch = re.search(r'\\href\{https://github\.com/([^}]+)\}', resumeContent)
        if githubMatch:
            resumeData["personalInfo"]["github"] = f"github.com/{githubMatch.group(1).strip()}"
            
        # Extract website URL (looking for faBriefcase pattern)
        websiteMatch = re.search(r'faBriefcase.*?href\{([^}]+)\}', resumeContent)
        if websiteMatch:
            resumeData["personalInfo"]["website"] = websiteMatch.group(1).strip()
        

        skillsPattern = r'\\section{Technical Skills}(.*?)\\vspace{-14pt}'
        skillsMatch = re.search(skillsPattern, resumeContent, re.DOTALL)
        if skillsMatch:
            skillsContent = skillsMatch.group(1).strip()
            
            # Parse skills into categories
            skillsDict = {}
            
            # Find all textbf{Category}{: skills} patterns
            categoryPattern = r'\\textbf\{([^}]+)\}\{:\s*([^}]+)\}'
            categoryMatches = re.findall(categoryPattern, skillsContent)
            
            for category, skillsText in categoryMatches:
                # Clean category name
                categoryClean = category.replace('\\', '').strip()
                
                # Split skills by comma and clean them
                skillsList = []
                if skillsText:
                    skillsRaw = re.split(r',\s*', skillsText)
                    for skill in skillsRaw:
                        # Clean LaTeX formatting
                        skillClean = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', skill)
                        skillClean = re.sub(r'\\[a-zA-Z]+', '', skillClean)
                        skillClean = skillClean.strip()
                        if skillClean:
                            skillsList.append(skillClean)
                
                skillsDict[categoryClean] = skillsList
            
            # Handle certifications separately if they exist
            certPattern = r'\\textbf\{Certifications\}\{:\s*([^}]*(?:\}[^}]*)*)\}'
            certMatch = re.search(certPattern, skillsContent)
            if certMatch:
                certContent = certMatch.group(1)
                # Extract certification names from href links
                certLinks = re.findall(r'\\href\{[^}]*\}\{([^}]*)\}', certContent)
                if certLinks:
                    skillsDict["Certifications"] = certLinks
            
            resumeData["technicalSkills"] = skillsDict
            
            # Also create the new frontend-compatible format
            technical_skills_categories = []
            for category, skills in skillsDict.items():
                if category.lower() != "certifications" and isinstance(skills, list):
                    technical_skills_categories.append({
                        "categoryName": category,
                        "skills": ", ".join(skills)
                    })
            resumeData["technicalSkillsCategories"] = technical_skills_categories
        

        experiencePattern = r'\\section{Work Experience}(.*?)\\vspace{-14pt}'
        experienceMatch = re.search(experiencePattern, resumeContent, re.DOTALL)
        if experienceMatch:
            experienceContent = experienceMatch.group(1)
            
            # Use improved parser for better nested structure handling
            try:
                resumeData["workExperience"] = parseWorkExperience(experienceContent)
            except Exception as e:
                # Handle both normal and BeginAccSupp/EndAccSupp formatted entries
                entryPattern = r'\\workExSubheading\{([^}]+)\}\{([^{}]*(?:\\BeginAccSupp\{[^}]*\}[^{}]*\\EndAccSupp\{\}|[^{}])*)\}\{([^}]+)\}\{([^}]+)\}(.*?)(?=\\workExSubheading|\\resumeSubHeadingListEnd)'
                entries = re.findall(entryPattern, experienceContent, re.DOTALL)
                
                # Clean up job titles that might have BeginAccSupp formatting
                cleaned_entries = []
                for company, jobTitle, location, duration, description in entries:
                    # Remove BeginAccSupp/EndAccSupp formatting from job title
                    cleanJobTitle = re.sub(r'\\BeginAccSupp\{[^}]*\}(.*?)\\EndAccSupp\{\}', r'\1', jobTitle)
                    cleaned_entries.append((company, cleanJobTitle, location, duration, description))
                entries = cleaned_entries
                
                for entry in entries:
                    company, jobTitle, location, duration, description = entry
                    
                    # Extract bullet points with better nested braces handling
                    bullets = []
                    bulletMatches = re.finditer(r'\\resumeItem\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', description)
                    for match in bulletMatches:
                        bulletText = match.group(1)
                        # Clean up LaTeX formatting but preserve bold formatting
                        bulletClean = re.sub(r'\\textbf\{([^}]*)\}', r'**\1**', bulletText)  # Convert to markdown bold
                        bulletClean = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', bulletClean)  # Remove other LaTeX commands
                        
                        # Clean up common LaTeX escape sequences
                        bulletClean = re.sub(r'\\%', '%', bulletClean)  # Fix percentages
                        bulletClean = re.sub(r'\\&', '&', bulletClean)  # Fix ampersands
                        bulletClean = re.sub(r'\\\\', ' ', bulletClean)  # Fix double backslashes
                        bulletClean = re.sub(r'\\\$', '$', bulletClean)  # Fix dollar signs  
                        bulletClean = re.sub(r'\\([#&%$_{}])', r'\1', bulletClean)  # Fix other escaped chars
                        bulletClean = re.sub(r'\s+', ' ', bulletClean)  # Normalize whitespace
                        
                        bullets.append(bulletClean.strip())
                    
                    resumeData["workExperience"].append({
                        "jobTitle": jobTitle.strip(),
                        "company": company.strip(), 
                        "location": location.strip(),
                        "duration": duration.strip(),
                        "bulletPoints": bullets
                    })
        

        projectsPattern = r'\\section{Projects}(.*?)%-----------PROJECTS END-----------'
        projectsMatch = re.search(projectsPattern, resumeContent, re.DOTALL)
        if projectsMatch:
            projectsContent = projectsMatch.group(1)
            
            # Use improved parser for better nested structure handling
            try:
                parsedProjects = parseProjects(projectsContent)
                if len(parsedProjects) > 0:
                    resumeData["projects"] = parsedProjects
                else:
                    raise Exception("No projects found by improved parser")
            except Exception as e:
                resumeData["projects"] = []
                
                patterns = [
                    r'\\resumeProjectHeading\{\\textbf\{\{([^}]+)\}\}[^}]*\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd\s*\\vspace\{-20pt\}',
                    r'\\resumeProjectHeading\{[^{}]*\{([^}]+)\}[^{}]*\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd\s*(?:\\vspace\{-20pt\}|\\resumeSubHeadingListEnd)',
                    r'\\resumeProjectHeading\{.*?\{([^}]+)\}.*?\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd'
                ]
                
                projectEntries = []
                for pattern in patterns:
                    projectEntries = re.findall(pattern, projectsContent, re.DOTALL)
                    if projectEntries:
                        break
                
                if not projectEntries:
                    pass
                
                for entry in projectEntries:
                    projectName, techStack, description = entry
                    
                    # Extract project link from the project heading
                    # Look for the full project heading in the original content to extract the link
                    projectHeadingPattern = rf'\\resumeProjectHeading.*?{re.escape(projectName)}.*?\\resumeItemListStart'
                    projectHeadingMatch = re.search(projectHeadingPattern, projectsContent, re.DOTALL)
                    projectLink = "#"  # Default link
                    
                    if projectHeadingMatch:
                        headingText = projectHeadingMatch.group(0)
                        linkPattern = r'\\href\{([^}]*)\}\{([^}]*)\}'
                        linkMatch = re.search(linkPattern, headingText)
                        if linkMatch:
                            projectLink = linkMatch.group(1)
                            linkText = linkMatch.group(2)
                        else:
                            linkText = "Link"
                    else:
                        linkText = "Link"
                    
                    # Clean tech stack from BeginAccSupp formatting
                    cleanTechStack = re.sub(r'\\BeginAccSupp\{[^}]*\}(.*?)\\EndAccSupp\{\}', r'\1', techStack)
                    cleanTechStack = re.sub(r'\s*\$\|\$\s*', ' | ', cleanTechStack.strip())
                    cleanTechStack = re.sub(r'\s*\|\s*', ' | ', cleanTechStack)
                    
                    # Extract bullet points with nested braces support
                    bullets = []
                    bulletMatches = re.finditer(r'\\resumeItem\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', description)
                    for match in bulletMatches:
                        bulletText = match.group(1)
                        bulletClean = cleanLatexText(bulletText) # Using unified cleaner
                        bullets.append(bulletClean.strip())
                    
                    resumeData["projects"].append({
                        "projectName": projectName.strip(),
                        "techStack": cleanTechStack,
                        "projectLink": projectLink.strip(),
                        "linkText": linkText.strip(),
                        "duration": "", # No duration in this format
                        "bulletPoints": bullets
                    })
        

        educationPattern = r'\\section{Education}(.*?)%-----------EDUCATION END-----------'
        educationMatch = re.search(educationPattern, resumeContent, re.DOTALL)
        if educationMatch:
            educationContent = educationMatch.group(1).strip()
            
            educationEntries = []
            
            # Find all resumeSubheading entries first
            subheadingPattern = r'\\resumeSubheading\s*\{([^}]+)\}\{([^}]+)\}\s*\{([^}]+)\}\{([^}]*)\}'
            subheadingMatches = list(re.finditer(subheadingPattern, educationContent))
            
            for i, match in enumerate(subheadingMatches):
                university, date, degree, additional = match.groups()
                
                # Parse degree and track if present
                degreeParts = degree.split('|')
                mainDegree = degreeParts[0].strip() if degreeParts else degree.strip()
                track = degreeParts[1].strip() if len(degreeParts) > 1 else ""
                
                # Find coursework that follows this education entry
                # Look for coursework between this entry and the next entry (or end of section)
                startPos = match.end()
                if i + 1 < len(subheadingMatches):
                    endPos = subheadingMatches[i + 1].start()
                    sectionContent = educationContent[startPos:endPos]
                else:
                    sectionContent = educationContent[startPos:]
                
                # Extract coursework for this specific education entry
                coursework = []
                courseworkPattern = r'Coursework:\s*([^\\]+(?:\\vspace[^\\]*)?)'
                courseworkMatch = re.search(courseworkPattern, sectionContent)
                if courseworkMatch:
                    courseworkText = courseworkMatch.group(1).strip()
                    # Remove any LaTeX formatting like \vspace{-4pt}
                    courseworkText = re.sub(r'\\vspace\{[^}]*\}', '', courseworkText).strip()
                    # Split by comma and clean
                    coursework = [cleanLatexText(course) for course in courseworkText.split(',') if course.strip()]
                
                educationEntry = {
                    "university": university.strip(),
                    "degree": mainDegree,
                    "track": track,
                    "date": date.strip(),
                    "additional": additional.strip() if additional else "",
                    "coursework": coursework
                }
                
                educationEntries.append(educationEntry)
            
            # Store all education entries (consistent with other sections)
            resumeData["education"] = educationEntries
            

        # Extract Certifications
        try:
            parsedCertifications = parseCertifications(resumeContent)
            resumeData["certifications"] = parsedCertifications
        except Exception as e:
            # Fallback to old parsing method for compatibility
            certPattern = r'\\section{Certifications}(.*?)\\vspace{[^}]+}'
            certMatch = re.search(certPattern, resumeContent, re.DOTALL)
            if certMatch:
                certContent = certMatch.group(1).strip()
                # Extract URLs and text from href patterns
                href_patterns = re.findall(r'\\href\{([^}]*)\}\{([^}]*)\}', certContent)
                certifications = []
                for url, text in href_patterns:
                    clean_text = cleanLatexText(text)
                    certifications.append({
                        "url": url.strip(),
                        "text": clean_text
                    })
                resumeData["certifications"] = certifications

        # Extract Invisible Keywords (ATS Section)
        invisiblePattern = r'\\pdfliteral direct \{3 Tr\}\s*\n([^%]*?)(?:\n%|\s*\\pdfliteral direct \{0 Tr\})'
        invisibleMatch = re.search(invisiblePattern, resumeContent, re.DOTALL)
        if invisibleMatch:
            invisibleContent = invisibleMatch.group(1).strip()
            # Clean up any LaTeX comments and normalize whitespace
            invisibleContent = re.sub(r'%.*?\n', '', invisibleContent)  # Remove comments
            invisibleContent = re.sub(r'\s+', ' ', invisibleContent)    # Normalize whitespace
            resumeData["invisibleKeywords"] = invisibleContent.strip()
        
        return ResumeParseResponse(
            success=True,
            resumeData=resumeData,
            message="Resume parsed successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.post("/updateResume", response_model=ResumeUpdateResponse)
async def updateResumeEndpoint(request: ResumeUpdateRequest):
    """Update the resume.tex file with edited content using template-based regeneration"""
    try:
        from resume_templates import generate_complete_resume_template
        
        resumeData = request.resumeData
        
        # Generate the complete resume using the template system
        # This ensures no data is lost and maintains consistent formatting
        complete_resume_content = generate_complete_resume_template(resumeData)
        
        # Write the complete new resume to file
        resumeFilePath = "template/resume.tex"
        with open(resumeFilePath, 'w', encoding='utf-8') as f:
            f.write(complete_resume_content)
        
        return ResumeUpdateResponse(
            success=True,
            message="Resume updated successfully using template system"
        )
        
    except Exception as e:
        print(f"Error updating resume: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update resume: {str(e)}")

@app.post("/extractCompanyInfo", response_model=CompanyPositionResponse)
async def extractCompanyInfoEndpoint(request: JobDescriptionRequest):
    """Extract company name and position from job description"""
    try:
        state = {
            "job_description": request.jobDescription,
            "resume": ""
        }
        
        result = extract_info(state)
        
        return CompanyPositionResponse(
            companyName=result["company_name"],
            position=result["position"]
        )
        
    except Exception as e:
        print(f"Error in extractCompanyInfo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to extract company info: {str(e)}")

@app.post("/editTechnicalSkills", response_model=ResumeUpdateResponse)
async def editTechnicalSkillsEndpoint(sessionId: str):
    """Edit technical skills section based on job description"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        result = edit_technical_skills(state)
        
        # Update session state
        workflowStates[sessionId].update(result)
        
        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Technical skills updated successfully"
        )
        
    except Exception as e:
        print(f"Error in editTechnicalSkills: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit technical skills: {str(e)}")

@app.post("/editExperience", response_model=ResumeUpdateResponse)
async def editExperienceEndpoint(sessionId: str):
    """Edit work experience section using STAR/XYZ framework"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        result = edit_experience(state)
        
        # Update session state
        workflowStates[sessionId].update(result)
        
        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Experience section updated successfully"
        )
        
    except Exception as e:
        print(f"Error in editExperience: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit experience: {str(e)}")

@app.post("/editProjects", response_model=ResumeUpdateResponse)
async def editProjectsEndpoint(sessionId: str):
    """Edit projects section with achievement-oriented descriptions"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        result = edit_projects(state)
        
        # Update session state
        workflowStates[sessionId].update(result)
        
        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Projects section updated successfully"
        )
        
    except Exception as e:
        print(f"Error in editProjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit projects: {str(e)}")

@app.post("/judgeQuality", response_model=QualityScoreResponse)
async def judgeQualityEndpoint(sessionId: str):
    """Evaluate resume quality and provide feedback"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        result = judge_resume_quality(state)
        
        # Update session state
        workflowStates[sessionId].update(result)
        
        return QualityScoreResponse(
            score=result["score"],
            feedback=result["feedback"],
            downsides=result["downsides"],
            iterationCount=result["iteration_count"]
        )
        
    except Exception as e:
        print(f"Error in judgeQuality: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to judge quality: {str(e)}")

@app.post("/compileResume", response_model=CompileResponse)
async def compileResumeEndpoint(sessionId: str):
    """Compile LaTeX resume to PDF"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        result = compile_resume(state)
        
        # Update session state
        workflowStates[sessionId].update(result)
        
        success = result["pdf_path"] is not None
        message = "Resume compiled successfully" if success else "Failed to compile resume"
        
        return CompileResponse(
            pdfPath=result["pdf_path"],
            success=success,
            message=message
        )
        
    except Exception as e:
        print(f"Error in compileResume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to compile resume: {str(e)}")

@app.get("/downloadResume/{sessionId}")
async def downloadResumeEndpoint(sessionId: str):
    """Download the compiled PDF resume"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        pdfPath = state.get("pdf_path")
        
        if not pdfPath or not os.path.exists(pdfPath):
            raise HTTPException(status_code=404, detail="PDF file not found")
            
        return FileResponse(
            path=pdfPath,
            media_type='application/pdf',
            filename=os.path.basename(pdfPath)
        )
        
    except Exception as e:
        print(f"Error in downloadResume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download resume: {str(e)}")

@app.post("/initializeSession")
async def initializeSessionEndpoint(request: JobDescriptionRequest):
    """Initialize a new workflow session"""
    try:
        import uuid
        sessionId = str(uuid.uuid4())
        
        # Initialize state with job description and original resume
        from agent import get_resume_content
        resumeContent = get_resume_content()
        
        workflowStates[sessionId] = {
            "job_description": request.jobDescription,
            "resume": resumeContent,
            "tailored_resume": resumeContent,  # Initialize with original resume
            "company_name": "",
            "position": "",
            "iteration_count": 0,
            "score": 0.0,
            "feedback": "",
            "downsides": "",
            "pdf_path": None
        }
        
        print(f"Session {sessionId} initialized successfully")
        return {"sessionId": sessionId, "message": "Session initialized successfully"}
        
    except Exception as e:
        print(f"Error in initializeSession: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize session: {str(e)}")

@app.post("/fullWorkflow", response_model=WorkflowResponse)
async def fullWorkflowEndpoint(request: JobDescriptionRequest, background_tasks: BackgroundTasks):
    """Run the complete resume tailoring workflow"""
    try:
        import uuid
        sessionId = str(uuid.uuid4())
        
        print(f"Starting full workflow for session: {sessionId}")
        
        # Initialize state
        from agent import get_resume_content
        resumeContent = get_resume_content()
        state = {
            "job_description": request.jobDescription,
            "resume": resumeContent,
            "tailored_resume": resumeContent,  # Initialize with original resume
            "company_name": "",
            "position": "",
            "iteration_count": 0,
            "score": 0.0,
            "feedback": "",
            "downsides": "",
            "pdf_path": None
        }
        
        # Store in session
        workflowStates[sessionId] = state
        
        # Step 1: Extract company info
        print("Extracting company information...")
        state.update(extract_info(state))
        
        # Main workflow loop
        maxIterations = 3
        iteration = 0
        
        while iteration < maxIterations:
            iteration += 1
            print(f"Starting iteration {iteration}")
            
            # Step 2: Edit technical skills
            print("Editing technical skills...")
            state.update(edit_technical_skills(state))
            
            # Step 3: Edit experience
            print("Editing experience section...")
            state.update(edit_experience(state))
            
            # Step 4: Edit projects
            print("Editing projects section...")
            state.update(edit_projects(state))
            
            # Step 5: Judge quality
            print("Evaluating resume quality...")
            state.update(judge_resume_quality(state))
            
            # Decision point
            decision = decide_after_judging(state)
            
            if decision == "compile_resume" or state["score"] >= 90:
                print(f"Quality threshold met. Score: {state['score']}")
                break
                
            print(f"Score {state['score']} below threshold. Continuing iteration...")
        
        # Final compilation
        print("Compiling final resume...")
        state.update(compile_resume(state))
        
        # Update session state
        workflowStates[sessionId] = state
        
        success = state.get("pdf_path") is not None
        message = f"Workflow completed successfully. Final score: {state.get('score', 0)}" if success else "Workflow completed but compilation failed"
        
        return WorkflowResponse(
            success=success,
            finalScore=state.get("score", 0),
            pdfPath=state.get("pdf_path"),
            iterationCount=state.get("iteration_count", 0),
            message=message
        )
        
    except Exception as e:
        print(f"Error in fullWorkflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")

@app.get("/sessionStatus/{sessionId}")
async def getSessionStatusEndpoint(sessionId: str):
    """Get current status of a workflow session"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflowStates[sessionId]
        
        return {
            "sessionId": sessionId,
            "companyName": state.get("company_name", ""),
            "position": state.get("position", ""),
            "currentScore": state.get("score", 0),
            "iterationCount": state.get("iteration_count", 0),
            "hasPdf": state.get("pdf_path") is not None,
            "status": "completed" if state.get("pdf_path") else "in_progress"
        }
        
    except Exception as e:
        print(f"Error in getSessionStatus: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")

@app.delete("/session/{sessionId}")
async def deleteSessionEndpoint(sessionId: str):
    """Clean up session data"""
    try:
        if sessionId in workflowStates:
            del workflowStates[sessionId]
            return {"message": "Session deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
            
    except Exception as e:
        print(f"Error in deleteSession: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting Resume Forge API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)