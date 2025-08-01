from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
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

# Global state storage (in production, use Redis or database)
workflow_states: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def rootEndpoint():
    """Health check endpoint"""
    return {"message": "Resume Forge API is running", "status": "healthy"}

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
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)