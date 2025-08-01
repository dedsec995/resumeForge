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

# Global state storage (in production, use Redis or database)
workflow_states: Dict[str, Dict[str, Any]] = {}

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
        
        # Get the resume content
        resume_content = get_resume_content()
        
        # Initialize the parsed data structure
        resume_data = {
            "personalInfo": {},
            "technicalSkills": "",
            "workExperience": [],
            "projects": [],
            "education": "",
            "certifications": "",
            "rawContent": resume_content
        }
        
        # Extract Personal Information
        name_match = re.search(r'\\huge \\scshape ([^}]+)\}', resume_content)
        if name_match:
            resume_data["personalInfo"]["name"] = name_match.group(1).strip()
            
        phone_match = re.search(r'\\faPhone\\ \\underline\{([^}]+)\}', resume_content)
        if phone_match:
            resume_data["personalInfo"]["phone"] = phone_match.group(1).strip()
            
        email_match = re.search(r'\\href\{mailto:([^}]+)\}', resume_content)
        if email_match:
            resume_data["personalInfo"]["email"] = email_match.group(1).strip()
            
        linkedin_match = re.search(r'\\href\{https://www\.linkedin\.com/in/([^}]+)\}', resume_content)
        if linkedin_match:
            resume_data["personalInfo"]["linkedin"] = f"linkedin.com/in/{linkedin_match.group(1).strip()}"
            
        github_match = re.search(r'\\href\{https://github\.com/([^}]+)\}', resume_content)
        if github_match:
            resume_data["personalInfo"]["github"] = f"github.com/{github_match.group(1).strip()}"
        
        # Extract Technical Skills Section - Parse into structured categories
        skills_pattern = r'\\section{Technical Skills}(.*?)\\vspace{-13pt}'
        skills_match = re.search(skills_pattern, resume_content, re.DOTALL)
        if skills_match:
            skills_content = skills_match.group(1).strip()
            
            # Parse skills into categories
            skills_dict = {}
            
            # Find all textbf{Category}{: skills} patterns
            category_pattern = r'\\textbf\{([^}]+)\}\{:\s*([^}]+)\}'
            category_matches = re.findall(category_pattern, skills_content)
            
            for category, skills_text in category_matches:
                # Clean category name
                category_clean = category.replace('\\', '').strip()
                
                # Split skills by comma and clean them
                skills_list = []
                if skills_text:
                    skills_raw = re.split(r',\s*', skills_text)
                    for skill in skills_raw:
                        # Clean LaTeX formatting
                        skill_clean = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', skill)
                        skill_clean = re.sub(r'\\[a-zA-Z]+', '', skill_clean)
                        skill_clean = skill_clean.strip()
                        if skill_clean:
                            skills_list.append(skill_clean)
                
                skills_dict[category_clean] = skills_list
            
            # Handle certifications separately if they exist
            cert_pattern = r'\\textbf\{Certifications\}\{:\s*([^}]*(?:\}[^}]*)*)\}'
            cert_match = re.search(cert_pattern, skills_content)
            if cert_match:
                cert_content = cert_match.group(1)
                # Extract certification names from href links
                cert_links = re.findall(r'\\href\{[^}]*\}\{([^}]*)\}', cert_content)
                if cert_links:
                    skills_dict["Certifications"] = cert_links
            
            resume_data["technicalSkills"] = skills_dict
        
        # Extract Work Experience Section using improved parser
        experience_pattern = r'\\section{Work Experience}(.*?)\\vspace{-12pt}'
        experience_match = re.search(experience_pattern, resume_content, re.DOTALL)
        if experience_match:
            experience_content = experience_match.group(1)
            
            # Use improved parser for better nested structure handling
            from latex_parser import parse_work_experience
            try:
                resume_data["workExperience"] = parse_work_experience(experience_content)
            except Exception as e:
                print(f"Error parsing work experience with improved parser: {e}")
                # Fallback to original method
                entry_pattern = r'\\workExSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}(.*?)(?=\\workExSubheading|\\resumeSubHeadingListEnd)'
                entries = re.findall(entry_pattern, experience_content, re.DOTALL)
                
                for entry in entries:
                    company, job_title, location, duration, description = entry
                    
                    # Extract bullet points with better nested braces handling
                    bullets = []
                    bullet_matches = re.finditer(r'\\resumeItem\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', description)
                    for match in bullet_matches:
                        bullet_text = match.group(1)
                        # Clean up LaTeX formatting but preserve content
                        bullet_clean = re.sub(r'\\textbf\{([^}]*)\}', r'\1', bullet_text)
                        bullets.append(bullet_clean.strip())
                    
                    resume_data["workExperience"].append({
                        "jobTitle": job_title.strip(),
                        "company": company.strip(), 
                        "location": location.strip(),
                        "duration": duration.strip(),
                        "bulletPoints": bullets
                    })
        
        # Extract Projects Section using improved parser
        projects_pattern = r'\\section{Projects}(.*?)%-----------PROJECTS END-----------'
        projects_match = re.search(projects_pattern, resume_content, re.DOTALL)
        if projects_match:
            projects_content = projects_match.group(1)
            
            # Use improved parser for better nested structure handling
            from latex_parser import parse_projects
            try:
                parsed_projects = parse_projects(projects_content)
                print(f"Improved parser found {len(parsed_projects)} projects")
                if len(parsed_projects) > 0:
                    resume_data["projects"] = parsed_projects
                else:
                    raise Exception("No projects found by improved parser")
            except Exception as e:
                print(f"Error parsing projects with improved parser: {e}")
                # Fallback to original method with improved patterns
                print("Falling back to regex parsing for projects")
                
                # Initialize projects list for fallback
                resume_data["projects"] = []
                
                # Try multiple patterns to handle the complex structure
                patterns = [
                    # Pattern 1: Full complex structure
                    r'\\resumeProjectHeading\{\\textbf\{\{([^}]+)\}\}[^}]*\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd',
                    # Pattern 2: Simpler structure
                    r'\\resumeProjectHeading\{[^{}]*\{([^}]+)\}[^{}]*\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd',
                    # Pattern 3: Even simpler
                    r'\\resumeProjectHeading\{.*?\{([^}]+)\}.*?\}\{([^}]+)\}.*?\\resumeItemListStart(.*?)\\resumeItemListEnd'
                ]
                
                project_entries = []
                for pattern in patterns:
                    project_entries = re.findall(pattern, projects_content, re.DOTALL)
                    if project_entries:
                        print(f"Found {len(project_entries)} projects with pattern")
                        break
                
                if not project_entries:
                    # Debug: print the actual content to see structure
                    print("No projects found. Content preview:")
                    print(projects_content[:500])
                
                for entry in project_entries:
                    project_name, tech_stack, description = entry
                    
                    # Extract bullet points with nested braces support
                    bullets = []
                    bullet_matches = re.finditer(r'\\resumeItem\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', description)
                    for match in bullet_matches:
                        bullet_text = match.group(1)
                        # Clean up LaTeX formatting but keep content
                        bullet_clean = re.sub(r'\\textbf\{([^}]*)\}', r'\1', bullet_text)
                        bullets.append(bullet_clean.strip())
                    
                    resume_data["projects"].append({
                        "projectName": project_name.strip(),
                        "techStack": tech_stack.strip(),
                        "duration": "", # No duration in this format
                        "bulletPoints": bullets
                    })
        
        # Extract Education Section - Parse into structured format
        education_pattern = r'\\section{Education}(.*?)%-----------EDUCATION END-----------'
        education_match = re.search(education_pattern, resume_content, re.DOTALL)
        if education_match:
            education_content = education_match.group(1).strip()
            
            education_entries = []
            
            # Find all resumeSubheading entries first
            subheading_pattern = r'\\resumeSubheading\s*\{([^}]+)\}\{([^}]+)\}\s*\{([^}]+)\}\{([^}]*)\}'
            subheading_matches = list(re.finditer(subheading_pattern, education_content))
            
            for i, match in enumerate(subheading_matches):
                university, date, degree, additional = match.groups()
                
                # Parse degree and track if present
                degree_parts = degree.split('|')
                main_degree = degree_parts[0].strip() if degree_parts else degree.strip()
                track = degree_parts[1].strip() if len(degree_parts) > 1 else ""
                
                # Find coursework that follows this education entry
                # Look for coursework between this entry and the next entry (or end of section)
                start_pos = match.end()
                if i + 1 < len(subheading_matches):
                    end_pos = subheading_matches[i + 1].start()
                    section_content = education_content[start_pos:end_pos]
                else:
                    section_content = education_content[start_pos:]
                
                # Extract coursework for this specific education entry
                coursework = []
                coursework_pattern = r'Coursework:\s*([^\\]+(?:\\vspace[^\\]*)?)'
                coursework_match = re.search(coursework_pattern, section_content)
                if coursework_match:
                    coursework_text = coursework_match.group(1).strip()
                    # Remove any LaTeX formatting like \vspace{-4pt}
                    coursework_text = re.sub(r'\\vspace\{[^}]*\}', '', coursework_text).strip()
                    # Split by comma and clean
                    coursework = [course.strip() for course in coursework_text.split(',') if course.strip()]
                
                education_entry = {
                    "university": university.strip(),
                    "degree": main_degree,
                    "track": track,
                    "date": date.strip(),
                    "additional": additional.strip() if additional else "",
                    "coursework": coursework
                }
                
                education_entries.append(education_entry)
            
            # Store all education entries (consistent with other sections)
            resume_data["education"] = education_entries
            
        # Extract Certifications if present
        cert_pattern = r'\\section{Certifications}(.*?)\\vspace{[^}]+}'
        cert_match = re.search(cert_pattern, resume_content, re.DOTALL)
        if cert_match:
            cert_content = cert_match.group(1).strip()
            # Clean up LaTeX formatting
            cert_clean = re.sub(r'\\[a-zA-Z]+{([^}]*)}', r'\1', cert_content)
            cert_clean = re.sub(r'\\[a-zA-Z]+', '', cert_clean)
            cert_clean = re.sub(r'\s+', ' ', cert_clean).strip()
            resume_data["certifications"] = cert_clean
        
        return ResumeParseResponse(
            success=True,
            resumeData=resume_data,
            message="Resume parsed successfully"
        )
        
    except Exception as e:
        print(f"Error in parseResume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        result = edit_technical_skills(state)
        
        # Update session state
        workflow_states[sessionId].update(result)
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        result = edit_experience(state)
        
        # Update session state
        workflow_states[sessionId].update(result)
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        result = edit_projects(state)
        
        # Update session state
        workflow_states[sessionId].update(result)
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        result = judge_resume_quality(state)
        
        # Update session state
        workflow_states[sessionId].update(result)
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        result = compile_resume(state)
        
        # Update session state
        workflow_states[sessionId].update(result)
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        pdf_path = state.get("pdf_path")
        
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
            
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=os.path.basename(pdf_path)
        )
        
    except Exception as e:
        print(f"Error in downloadResume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download resume: {str(e)}")

@app.post("/initializeSession")
async def initializeSessionEndpoint(request: JobDescriptionRequest):
    """Initialize a new workflow session"""
    try:
        import uuid
        session_id = str(uuid.uuid4())
        
        # Initialize state with job description and original resume
        from agent import get_resume_content
        resume_content = get_resume_content()
        
        workflow_states[session_id] = {
            "job_description": request.jobDescription,
            "resume": resume_content,
            "tailored_resume": resume_content,  # Initialize with original resume
            "company_name": "",
            "position": "",
            "iteration_count": 0,
            "score": 0.0,
            "feedback": "",
            "downsides": "",
            "pdf_path": None
        }
        
        print(f"Session {session_id} initialized successfully")
        return {"sessionId": session_id, "message": "Session initialized successfully"}
        
    except Exception as e:
        print(f"Error in initializeSession: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize session: {str(e)}")

@app.post("/fullWorkflow", response_model=WorkflowResponse)
async def fullWorkflowEndpoint(request: JobDescriptionRequest, background_tasks: BackgroundTasks):
    """Run the complete resume tailoring workflow"""
    try:
        import uuid
        session_id = str(uuid.uuid4())
        
        print(f"Starting full workflow for session: {session_id}")
        
        # Initialize state
        from agent import get_resume_content
        resume_content = get_resume_content()
        state = {
            "job_description": request.jobDescription,
            "resume": resume_content,
            "tailored_resume": resume_content,  # Initialize with original resume
            "company_name": "",
            "position": "",
            "iteration_count": 0,
            "score": 0.0,
            "feedback": "",
            "downsides": "",
            "pdf_path": None
        }
        
        # Store in session
        workflow_states[session_id] = state
        
        # Step 1: Extract company info
        print("Extracting company information...")
        state.update(extract_info(state))
        
        # Main workflow loop
        max_iterations = 3
        iteration = 0
        
        while iteration < max_iterations:
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
        workflow_states[session_id] = state
        
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
        if sessionId not in workflow_states:
            raise HTTPException(status_code=404, detail="Session not found")
            
        state = workflow_states[sessionId]
        
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
        if sessionId in workflow_states:
            del workflow_states[sessionId]
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