from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import os
import asyncio
from datetime import datetime
import uuid
from agent import workflow

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

class WorkflowSessionRequest(BaseModel):
    sessionId: str
    
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

# Create Resume Models
class CreateResumeRequest(BaseModel):
    jobDescription: str
    jobTitle: Optional[str] = ""
    companyName: Optional[str] = ""

class CreateResumeResponse(BaseModel):
    success: bool
    sessionId: str
    message: str
    timestamp: str

class CreateResumeSession(BaseModel):
    sessionId: str
    jobDescription: str
    jobTitle: str
    companyName: str
    timestamp: str
    filePath: str
    status: str = "created"

class GetSessionsResponse(BaseModel):
    success: bool
    sessions: list
    totalSessions: int

class GenerateLatexResponse(BaseModel):
    success: bool
    latexFilePath: Optional[str]
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
                "metadata": {
                    "lastUpdated": "",
                    "version": "1.0",
                    "created": datetime.now().isoformat()
                }
            }
            
            with open(json_path, 'w', encoding='utf-8') as file:
                json.dump(empty_data, file, indent=2, ensure_ascii=False)
            
            empty_data["invisibleKeywords"] = ""
            
            return ResumeParseResponse(
                success=True,
                resumeData=empty_data,
                message="New profile created - please fill in your information"
            )
        
        # Load existing JSON data
        with open(json_path, 'r', encoding='utf-8') as file:
            resume_data = json.load(file)
        
        # Ensure invisibleKeywords field exists
        if "invisibleKeywords" not in resume_data:
            resume_data["invisibleKeywords"] = ""
        
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
        
        # LaTeX file generation commented out - only updating JSON
        # try:
        #     from resume_templates import generate_complete_resume_template
        #     complete_resume_content = generate_complete_resume_template(resumeData)
        #     
        #     resumeFilePath = "template/resume.tex"
        #     with open(resumeFilePath, 'w', encoding='utf-8') as f:
        #         f.write(complete_resume_content)
        # except Exception as latex_error:
        #     print(f"Warning: Failed to generate LaTeX file: {str(latex_error)}")
        #     # Don't fail the entire operation if LaTeX generation fails
        
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
async def fullWorkflowEndpoint(request: WorkflowSessionRequest, background_tasks: BackgroundTasks):
    """Run the complete resume tailoring workflow"""
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{request.sessionId}.json"
        
        if not os.path.exists(sessions_dir):
            raise HTTPException(status_code=404, detail="Sessions directory not found")
        
        if not os.path.exists(session_file_path):
            raise HTTPException(status_code=404, detail="Resume session not found")
        
        with open(session_file_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        resume_data = {}
        if os.path.exists("resume_data.json"):
            try:
                with open("resume_data.json", 'r', encoding='utf-8') as f:
                    resume_data = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load resume_data.json: {e}")
                resume_data = {}

        job_description = session_data.get("jobDescription", "")
        
        combined_data = {
            "sessionId": request.sessionId,
            "jobDescription": job_description,
            **resume_data
        }
        
        try:
            result = workflow({"resume_data": combined_data})
            
            score = result.get("score", 0.0)
            company_name = result.get("company_name", "")
            position = result.get("position", "")
            tailored_resume = result.get("tailored_resume_data", {})
            
            session_data["workflowResult"] = {
                "score": score,
                "company_name": company_name,
                "position": position,
                "location": result.get("location", ""),
                "feedback": result.get("feedback", ""),
                "downsides": result.get("downsides", ""),
                "iteration_count": result.get("iteration_count", 0)
            }
            session_data["tailoredResume"] = tailored_resume.get("resumeData", {})
            session_data["status"] = "completed"
            session_data["completedAt"] = datetime.now().isoformat()
            session_data["score"] = score
            session_data["companyName"] = company_name
            session_data["position"] = position
            
            with open(session_file_path, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2, ensure_ascii=False)
            
            try:
                from resume_templates import generate_complete_resume_template
                
                latex_content = generate_complete_resume_template(tailored_resume.get("resumeData", {}))
                
                output_dir = "output"
                if not os.path.exists(output_dir):
                    os.makedirs(output_dir)
                
                latex_filename = f"resume_{request.sessionId}.tex"
                latex_file_path = os.path.join(output_dir, latex_filename)
                
                with open(latex_file_path, 'w', encoding='utf-8') as f:
                    f.write(latex_content)
                
                session_data["latexFilePath"] = latex_file_path
                session_data["metadata"]["lastUpdated"] = datetime.now().isoformat()
                
                with open(session_file_path, 'w', encoding='utf-8') as f:
                    json.dump(session_data, f, indent=2, ensure_ascii=False)
                    
            except Exception as latex_error:
                print(f"Warning: LaTeX generation failed: {str(latex_error)}")
            
            index_path = "create_resume_index.json"
            if os.path.exists(index_path):
                with open(index_path, 'r', encoding='utf-8') as f:
                    index_data = json.load(f)
                
                for session in index_data["sessions"]:
                    if session["sessionId"] == request.sessionId:
                        session["status"] = "completed"
                        session["score"] = score
                        session["companyName"] = company_name
                        session["position"] = position
                        break
                
                index_data["metadata"]["lastUpdated"] = datetime.now().isoformat()
                
                with open(index_path, 'w', encoding='utf-8') as f:
                    json.dump(index_data, f, indent=2, ensure_ascii=False)
            
            return WorkflowResponse(
                success=True,
                finalScore=result.get("score", 0.0),
                pdfPath=None,
                iterationCount=result.get("iteration_count", 0),
                message="Workflow completed successfully"
            )
            
        except Exception as workflow_error:
            error_data = {
                "error": str(workflow_error),
                "timestamp": datetime.now().isoformat(),
                "sessionId": request.sessionId
            }
            
            error_file_path = f"create_resume_sessions/{request.sessionId}_error.json"
            with open(error_file_path, 'w', encoding='utf-8') as f:
                json.dump(error_data, f, indent=2, ensure_ascii=False)
            
            return WorkflowResponse(
                success=False,
                finalScore=0.0,
                pdfPath=None,
                iterationCount=0,
                message=f"Workflow failed: {str(workflow_error)}"
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

# Create Resume Endpoints
@app.post("/createResumeSession", response_model=CreateResumeResponse)
async def createResumeSessionEndpoint(request: CreateResumeRequest):
    """Create a new resume session with job description"""
    try:
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create session data (without redundant resumeData)
        session_data = {
            "sessionId": session_id,
            "jobDescription": request.jobDescription,
            "timestamp": timestamp,
            "status": "created",
            "metadata": {
                "created": timestamp,
                "lastUpdated": timestamp,
                "wordCount": len(request.jobDescription.split()),
                "characterCount": len(request.jobDescription)
            }
        }
        
        # Ensure create_resume_sessions directory exists
        sessions_dir = "create_resume_sessions"
        if not os.path.exists(sessions_dir):
            os.makedirs(sessions_dir)
        
        # Save session to individual file
        session_file_path = f"{sessions_dir}/{session_id}.json"
        with open(session_file_path, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        # Update index file
        index_path = "create_resume_index.json"
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                index_data = json.load(f)
        else:
            index_data = {"sessions": [], "metadata": {"created": timestamp, "lastUpdated": "", "totalSessions": 0}}
        
        # Add session to index
        session_summary = {
            "sessionId": session_id,
            "timestamp": timestamp,
            "filePath": session_file_path,
            "status": "created",
            "preview": request.jobDescription[:200] + "..." if len(request.jobDescription) > 200 else request.jobDescription
        }
        
        index_data["sessions"].insert(0, session_summary)  # Add to beginning (newest first)
        index_data["metadata"]["lastUpdated"] = timestamp
        index_data["metadata"]["totalSessions"] = len(index_data["sessions"])
        
        if not index_data["metadata"]["created"]:
            index_data["metadata"]["created"] = timestamp
        
        # Save updated index
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        
        return CreateResumeResponse(
            success=True,
            sessionId=session_id,
            message="Resume session created successfully",
            timestamp=timestamp
        )
        
    except Exception as e:
        print(f"Error creating resume session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create resume session: {str(e)}")

@app.get("/getResumeSessions", response_model=GetSessionsResponse)
async def getResumeSessionsEndpoint():
    """Get all resume sessions"""
    try:
        index_path = "create_resume_index.json"
        
        if not os.path.exists(index_path):
            return GetSessionsResponse(
                success=True,
                sessions=[],
                totalSessions=0
            )
        
        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
        
        return GetSessionsResponse(
            success=True,
            sessions=index_data.get("sessions", []),
            totalSessions=index_data.get("metadata", {}).get("totalSessions", 0)
        )
        
    except Exception as e:
        print(f"Error fetching resume sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch resume sessions: {str(e)}")

@app.get("/getResumeSession/{session_id}")
async def getResumeSessionEndpoint(session_id: str):
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{session_id}.json"
        
        if not os.path.exists(sessions_dir):
            raise HTTPException(status_code=404, detail="Sessions directory not found")
        
        if not os.path.exists(session_file_path):
            raise HTTPException(status_code=404, detail="Resume session not found")
        
        with open(session_file_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        if session_data.get("latexFilePath") and os.path.exists(session_data["latexFilePath"]):
            with open(session_data["latexFilePath"], 'r', encoding='utf-8') as f:
                session_data["latexContent"] = f.read()
        
        return {
            "success": True,
            "sessionData": session_data
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Resume session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch resume session: {str(e)}")

@app.delete("/deleteResumeSession/{session_id}")
async def deleteResumeSessionEndpoint(session_id: str):
    """Delete a specific resume session"""
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{session_id}.json"
        
        # Remove session file
        if os.path.exists(session_file_path):
            os.remove(session_file_path)
        
        # Update index
        index_path = "create_resume_index.json"
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                index_data = json.load(f)
            
            # Remove session from index
            index_data["sessions"] = [s for s in index_data["sessions"] if s["sessionId"] != session_id]
            index_data["metadata"]["totalSessions"] = len(index_data["sessions"])
            index_data["metadata"]["lastUpdated"] = datetime.now().isoformat()
            
            with open(index_path, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, indent=2, ensure_ascii=False)
        
        return {
            "success": True,
            "message": "Resume session deleted successfully"
        }
        
    except Exception as e:
        print(f"Error deleting resume session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete resume session: {str(e)}")

@app.post("/generateLatex/{session_id}", response_model=GenerateLatexResponse)
async def generateLatexEndpoint(session_id: str):
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{session_id}.json"
        
        if not os.path.exists(sessions_dir):
            raise HTTPException(status_code=404, detail="Sessions directory not found")
        
        if not os.path.exists(session_file_path):
            raise HTTPException(status_code=404, detail="Resume session not found")
        
        with open(session_file_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        if session_data.get("status") != "completed" or not session_data.get("tailoredResume"):
            raise HTTPException(status_code=400, detail="Session not completed or no tailored resume data available")
        
        from resume_templates import generate_complete_resume_template
        
        latex_content = generate_complete_resume_template(session_data["tailoredResume"])
        
        output_dir = "output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        latex_filename = f"resume_{session_id}.tex"
        latex_file_path = os.path.join(output_dir, latex_filename)
        
        with open(latex_file_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        session_data["latexFilePath"] = latex_file_path
        session_data["metadata"]["lastUpdated"] = datetime.now().isoformat()
        
        with open(session_file_path, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        return GenerateLatexResponse(
            success=True,
            latexFilePath=latex_file_path,
            message="LaTeX file generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate LaTeX file: {str(e)}")

@app.get("/downloadPDF/{session_id}")
async def downloadPDFEndpoint(session_id: str):
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{session_id}.json"
        
        if not os.path.exists(session_file_path):
            raise HTTPException(status_code=404, detail="Resume session not found")
        
        with open(session_file_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        latex_file_path = session_data.get("latexFilePath")
        if not latex_file_path or not os.path.exists(latex_file_path):
            raise HTTPException(status_code=404, detail="LaTeX file not found. Please generate LaTeX first.")
        
        from latex2pdf import compile_latex
        output_dir = os.path.dirname(latex_file_path)
        
        try:
            compile_latex(latex_file_path, output_dir)
        except Exception as compile_error:
            raise HTTPException(status_code=500, detail=f"LaTeX compilation failed: {str(compile_error)}")
        
        pdf_filename = f"resume_{session_id}.pdf"
        pdf_file_path = os.path.join(output_dir, pdf_filename)
        
        if not os.path.exists(pdf_file_path):
            raise HTTPException(status_code=500, detail="PDF generation failed. The LaTeX file could not be compiled to PDF. Please check the LaTeX content for errors.")
        
        session_data["pdfFilePath"] = pdf_file_path
        session_data["metadata"]["lastUpdated"] = datetime.now().isoformat()
        
        with open(session_file_path, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        return FileResponse(
            path=pdf_file_path,
            media_type='application/pdf',
            filename=pdf_filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")

@app.get("/downloadLatex/{session_id}")
async def downloadLatexEndpoint(session_id: str):
    try:
        sessions_dir = "create_resume_sessions"
        session_file_path = f"{sessions_dir}/{session_id}.json"
        
        if not os.path.exists(session_file_path):
            raise HTTPException(status_code=404, detail="Resume session not found")
        
        with open(session_file_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        latex_file_path = session_data.get("latexFilePath")
        if not latex_file_path or not os.path.exists(latex_file_path):
            raise HTTPException(status_code=404, detail="LaTeX file not found")
        
        latex_filename = f"resume_{session_id}.tex"
        
        return FileResponse(
            path=latex_file_path,
            media_type='application/x-tex',
            filename=latex_filename
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download LaTeX: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting Resume Forge API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)