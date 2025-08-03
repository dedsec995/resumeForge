from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import os
import asyncio
from datetime import datetime
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
    """Load resume data from JSON file or create empty structure"""
    try:
        json_path = "./resume_data.json"
        
        # Check if JSON file exists, if not create empty structure
        if not os.path.exists(json_path):
            empty_data = {
                "personalInfo": {
                    "name": "",
                    "email": "",
                    "phone": "",
                    "linkedin": "",
                    "github": "",
                    "website": ""
                },
                "certifications": [],
                "technicalSkillsCategories": [],
            "workExperience": [],
            "projects": [],
                "education": [],
                "atsKeywords": "",
                "metadata": {
                    "lastUpdated": "",
                    "version": "1.0",
                    "created": datetime.now().isoformat()
                }
            }
            
            with open(json_path, 'w', encoding='utf-8') as file:
                json.dump(empty_data, file, indent=2, ensure_ascii=False)
            
            # Add backward compatibility fields
            empty_data["technicalSkills"] = {}
            empty_data["invisibleKeywords"] = empty_data.get("atsKeywords", "")
            
            return ResumeParseResponse(
                success=True,
                resumeData=empty_data,
                message="New profile created - please fill in your information"
            )
        
        # Load existing JSON data
        with open(json_path, 'r', encoding='utf-8') as file:
            resume_data = json.load(file)
        
        # Add technicalSkills for backward compatibility if needed
        if "technicalSkillsCategories" in resume_data and "technicalSkills" not in resume_data:
            technical_skills = {}
            for category in resume_data["technicalSkillsCategories"]:
                category_name = category.get("categoryName", "")
                skills_text = category.get("skills", "")
                if category_name and skills_text:
                    technical_skills[category_name] = skills_text.split(", ")
            resume_data["technicalSkills"] = technical_skills
        
        # Ensure backward compatibility fields exist
        if "invisibleKeywords" not in resume_data:
            resume_data["invisibleKeywords"] = resume_data.get("atsKeywords", "")
        
        return ResumeParseResponse(
            success=True,
            resumeData=resume_data,
            message="Resume data loaded successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load resume data: {str(e)}")

@app.post("/updateResume", response_model=ResumeUpdateResponse)
async def updateResumeEndpoint(request: ResumeUpdateRequest):
    """Save resume data to JSON file and optionally generate LaTeX"""
    try:
        json_path = "./resume_data.json"
        resumeData = request.resumeData
        
        # Add metadata
        if "metadata" not in resumeData:
            resumeData["metadata"] = {}
        
        resumeData["metadata"]["lastUpdated"] = datetime.now().isoformat()
        if "version" not in resumeData["metadata"]:
            resumeData["metadata"]["version"] = "1.0"
        if "created" not in resumeData["metadata"]:
            resumeData["metadata"]["created"] = datetime.now().isoformat()
        
        # Save to JSON file
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(resumeData, f, indent=2, ensure_ascii=False)
        
        # Optionally generate LaTeX file for backward compatibility
        try:
            from resume_templates import generate_complete_resume_template
            complete_resume_content = generate_complete_resume_template(resumeData)
            
            resumeFilePath = "template/resume.tex"
            with open(resumeFilePath, 'w', encoding='utf-8') as f:
                f.write(complete_resume_content)
        except Exception as latex_error:
            print(f"Warning: Failed to generate LaTeX file: {str(latex_error)}")
            # Don't fail the entire operation if LaTeX generation fails
        
        return ResumeUpdateResponse(
            success=True,
            message="Resume data saved successfully to JSON"
        )
        
    except Exception as e:
        print(f"Error saving resume data: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save resume data: {str(e)}")

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