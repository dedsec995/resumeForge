from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import os
import asyncio
from datetime import datetime
import uuid
from concurrent.futures import ThreadPoolExecutor
import re
from agent import workflow, extract_info
from auth_routes import authRouter
from auth_middleware import verifyFirebaseToken, optionalAuth
from database_operations import dbOps

app = FastAPI(
    title="Resume Forge API",
    description="AI-powered resume tailoring service",
    version="1.0.0",
)

# Thread pool for CPU-intensive background tasks
thread_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="workflow_")


def generate_resume_filename(
    person_name: str, company_name: str, position: str, session_id: str, extension: str
) -> str:
    """Generate resume filename using person name, company name and position, with spaces replaced by underscores"""
    try:
        clean_person = (
            re.sub(r"[^\w\s-]", "", person_name.strip()) if person_name else ""
        )
        clean_company = (
            re.sub(r"[^\w\s-]", "", company_name.strip()) if company_name else ""
        )
        clean_position = re.sub(r"[^\w\s-]", "", position.strip()) if position else ""

        clean_person = re.sub(r"\s+", "_", clean_person)
        clean_company = re.sub(r"\s+", "_", clean_company)
        clean_position = re.sub(r"\s+", "_", clean_position)

        filename_parts = []
        if clean_person:
            filename_parts.append(clean_person)
        if clean_company:
            filename_parts.append(clean_company)
        if clean_position:
            filename_parts.append(clean_position)

        if filename_parts:
            filename = "_".join(filename_parts)
            if len(filename) > 100:
                filename = filename[:100]
        else:
            filename = f"resume_{session_id}"

        return f"{filename}.{extension}"

    except Exception as e:
        print(f"Error generating filename: {e}")
        return f"resume_{session_id}.{extension}"


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://resumeforge.thatinsaneguy.com",
        "http://resumeforge.thatinsaneguy.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(authRouter)


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


# API Config Models
class ApiConfigRequest(BaseModel):
    apiKey: str


class ApiConfigResponse(BaseModel):
    success: bool
    message: str
    lastUpdated: Optional[str] = None


class GetApiConfigResponse(BaseModel):
    success: bool
    apiData: Dict[str, Any]
    message: str


# Global state storage (in production, use Redis or database)
workflowStates: Dict[str, Dict[str, Any]] = {}


@app.get("/")
async def rootEndpoint():
    """Health check endpoint"""
    return {"message": "Resume Forge API is running", "status": "healthy"}


@app.get("/globalCounter")
async def getGlobalCounterEndpoint():
    """Get the global job description counter"""
    try:
        globalCounter = dbOps.getGlobalCounter()
        return {
            "success": True,
            "totalJobDescriptions": globalCounter,
            "message": "Global counter retrieved successfully"
        }
    except Exception as e:
        print(f"Error getting global counter: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get global counter: {str(e)}"
        )

@app.get("/individualCounter")
async def getIndividualCounterEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Get the individual job description counter for the authenticated user"""
    try:
        individualCounter = dbOps.getIndividualCounter(userId)
        return {
            "success": True,
            "individualJobDescriptions": individualCounter,
            "message": "Individual counter retrieved successfully"
        }
    except Exception as e:
        print(f"Error getting individual counter: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get individual counter: {str(e)}"
        )

# RBAC Endpoints
@app.get("/rbac/status")
async def getRBACStatusEndpoint():
    """Get RBAC status - check how many users have accountTier field"""
    try:
        users_without_tier = dbOps.getUsersWithoutAccountTier()
        total_users = len(dbOps.db.collection("users").stream())
        users_with_tier = total_users - len(users_without_tier)
        
        return {
            "success": True,
            "totalUsers": total_users,
            "usersWithAccountTier": users_with_tier,
            "usersWithoutAccountTier": len(users_without_tier),
            "rbacImplementationComplete": len(users_without_tier) == 0,
            "message": "RBAC status retrieved successfully"
        }
    except Exception as e:
        print(f"Error getting RBAC status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get RBAC status: {str(e)}"
        )

@app.post("/rbac/update-existing-users")
async def updateExistingUsersRBACEndpoint():
    """Update all existing users to have accountTier: 'FREE'"""
    try:
        users_without_tier = dbOps.getUsersWithoutAccountTier()
        
        if not users_without_tier:
            return {
                "success": True,
                "message": "All users already have accountTier field",
                "updatedCount": 0,
                "skippedCount": 0
            }
        
        updated_count = 0
        failed_count = 0
        
        for user in users_without_tier:
            success = dbOps.updateUserAccountTier(user["userId"], "FREE")
            if success:
                updated_count += 1
            else:
                failed_count += 1
        
        return {
            "success": True,
            "message": f"Updated {updated_count} users with accountTier: FREE",
            "updatedCount": updated_count,
            "failedCount": failed_count,
            "totalProcessed": len(users_without_tier)
        }
    except Exception as e:
        print(f"Error updating existing users RBAC: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update existing users RBAC: {str(e)}"
        )


@app.get("/parseResume", response_model=ResumeParseResponse)
async def parseResumeEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Load user resume data from Firebase or create empty structure"""
    try:
        userData = dbOps.getUser(userId)

        if not userData or not userData.get("profile"):
            emptyProfile = {
                "personalInfo": {
                    "name": "",
                    "email": "",
                    "phone": "",
                    "linkedin": "",
                    "github": "",
                    "website": "",
                },
                "certifications": [],
                "technicalSkillsCategories": [],
                "workExperience": [],
                "projects": [],
                "education": [],
                "invisibleKeywords": "",
                "metadata": {
                    "lastUpdated": "",
                    "version": "1.0",
                    "created": datetime.now().isoformat(),
                },
            }

            return ResumeParseResponse(
                success=True,
                resumeData=emptyProfile,
                message="New profile created - please fill in your information",
            )

        profileData = userData["profile"]

        if "invisibleKeywords" not in profileData:
            profileData["invisibleKeywords"] = ""

        if "metadata" not in profileData:
            profileData["metadata"] = {
                "lastUpdated": userData.get("metadata", {}).get("lastUpdated", ""),
                "version": "1.0",
                "created": userData.get("metadata", {}).get("created", ""),
            }

        return ResumeParseResponse(
            success=True,
            resumeData=profileData,
            message="Resume data loaded successfully",
        )

    except Exception as e:
        print(f"Parse resume error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@app.post("/updateResume", response_model=ResumeUpdateResponse)
async def updateResumeEndpoint(
    request: ResumeUpdateRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Save user resume data to Firebase"""
    try:
        resumeData = request.resumeData

        success = dbOps.updateUserProfile(userId, resumeData)

        if success:
            return ResumeUpdateResponse(
                success=True, message="Resume data saved successfully to Firebase"
            )
        else:
            raise HTTPException(
                status_code=500, detail="Failed to save resume data to Firebase"
            )

    except Exception as e:
        print(f"Error saving resume data: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to save resume data: {str(e)}"
        )


@app.post("/extractCompanyInfo", response_model=CompanyPositionResponse)
async def extractCompanyInfoEndpoint(request: JobDescriptionRequest):
    """Extract company name and position from job description"""
    try:
        state = {"job_description": request.jobDescription, "resume": ""}

        result = extract_info(state)

        return CompanyPositionResponse(
            companyName=result["company_name"], position=result["position"]
        )

    except Exception as e:
        print(f"Error in extractCompanyInfo: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract company info: {str(e)}"
        )


@app.post("/editTechnicalSkills", response_model=ResumeUpdateResponse)
async def editTechnicalSkillsEndpoint(sessionId: str):
    """Edit technical skills section based on job description"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")

        state = workflowStates[sessionId]
        result = edit_technical_skills(state)

        workflowStates[sessionId].update(result)

        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Technical skills updated successfully",
        )

    except Exception as e:
        print(f"Error in editTechnicalSkills: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to edit technical skills: {str(e)}"
        )


@app.post("/editExperience", response_model=ResumeUpdateResponse)
async def editExperienceEndpoint(sessionId: str):
    """Edit work experience section using STAR/XYZ framework"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")

        state = workflowStates[sessionId]
        result = edit_experience(state)

        workflowStates[sessionId].update(result)

        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Experience section updated successfully",
        )

    except Exception as e:
        print(f"Error in editExperience: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to edit experience: {str(e)}"
        )


@app.post("/editProjects", response_model=ResumeUpdateResponse)
async def editProjectsEndpoint(sessionId: str):
    """Edit projects section with achievement-oriented descriptions"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")

        state = workflowStates[sessionId]
        result = edit_projects(state)

        workflowStates[sessionId].update(result)

        return ResumeUpdateResponse(
            tailoredResume=result["tailored_resume"],
            success=True,
            message="Projects section updated successfully",
        )

    except Exception as e:
        print(f"Error in editProjects: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to edit projects: {str(e)}"
        )


@app.post("/judgeQuality", response_model=QualityScoreResponse)
async def judgeQualityEndpoint(sessionId: str):
    """Evaluate resume quality and provide feedback"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")

        state = workflowStates[sessionId]
        result = judge_resume_quality(state)

        workflowStates[sessionId].update(result)

        return QualityScoreResponse(
            score=result["score"],
            feedback=result["feedback"],
            downsides=result["downsides"],
            iterationCount=result["iteration_count"],
        )

    except Exception as e:
        print(f"Error in judgeQuality: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to judge quality: {str(e)}"
        )


@app.post("/compileResume", response_model=CompileResponse)
async def compileResumeEndpoint(sessionId: str):
    """Compile LaTeX resume to PDF"""
    try:
        if sessionId not in workflowStates:
            raise HTTPException(status_code=404, detail="Session not found")

        state = workflowStates[sessionId]
        result = compile_resume(state)

        workflowStates[sessionId].update(result)

        success = result["pdf_path"] is not None
        message = (
            "Resume compiled successfully" if success else "Failed to compile resume"
        )

        return CompileResponse(
            pdfPath=result["pdf_path"], success=success, message=message
        )

    except Exception as e:
        print(f"Error in compileResume: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to compile resume: {str(e)}"
        )


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
            media_type="application/pdf",
            filename=os.path.basename(pdfPath),
        )

    except Exception as e:
        print(f"Error in downloadResume: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to download resume: {str(e)}"
        )


@app.post("/initializeSession")
async def initializeSessionEndpoint(request: JobDescriptionRequest):
    """Initialize a new workflow session"""
    try:
        import uuid

        sessionId = str(uuid.uuid4())

        from agent import get_resume_content

        resumeContent = get_resume_content()

        workflowStates[sessionId] = {
            "job_description": request.jobDescription,
            "resume": resumeContent,
            "tailored_resume": resumeContent,
            "company_name": "",
            "position": "",
            "iteration_count": 0,
            "score": 0.0,
            "feedback": "",
            "downsides": "",
            "pdf_path": None,
        }

        print(f"Session {sessionId} initialized successfully")
        return {"sessionId": sessionId, "message": "Session initialized successfully"}

    except Exception as e:
        print(f"Error in initializeSession: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to initialize session: {str(e)}"
        )


def run_workflow_sync(userId: str, sessionId: str):
    """Synchronous workflow function to run in thread pool"""
    try:
        print(f"Starting background workflow for session: {sessionId}")

        session_data = dbOps.getSession(userId, sessionId)
        if not session_data:
            print(f"Session not found during background processing: {sessionId}")
            return

        user_data = dbOps.getUser(userId)
        resume_data = {}
        if user_data and user_data.get("profile"):
            resume_data = user_data["profile"]
        else:
            print(f"Warning: No profile data found for user: {userId}")
            resume_data = {}

        job_description = session_data.get("jobDescription", "")

        combined_data = {
            "sessionId": sessionId,
            "jobDescription": job_description,
            **resume_data,
        }

        try:
            result = workflow({"resume_data": combined_data})

            score = result.get("score", 0.0)
            company_name = result.get("company_name", "")
            position = result.get("position", "")
            tailored_resume = result.get("tailored_resume_data", {})

            print(
                f"Workflow completed for session {sessionId}: Score {score}/100, Company: {company_name}, Position: {position}"
            )

            updateData = {
                "workflowResult": {
                    "score": score,
                    "company_name": company_name,
                    "position": position,
                    "location": result.get("location", ""),
                    "feedback": result.get("feedback", ""),
                    "downsides": result.get("downsides", ""),
                    "iteration_count": result.get("iteration_count", 0),
                },
                "tailoredResume": tailored_resume.get("resumeData", {}),
                "status": "completed",
                "completedAt": datetime.now().isoformat(),
                "score": score,
                "companyName": company_name,
                "position": position,
                "location": result.get("location", "Open to Relocation"),
            }

            dbOps.updateSession(userId, sessionId, updateData)
            print(f"Workflow completed successfully for session: {sessionId}")

            try:
                from resume_templates import generate_complete_resume_template

                # Get location from the workflow result
                location = result.get("location", "Open to Relocation")
                latex_content = generate_complete_resume_template(
                    tailored_resume.get("resumeData", {}), location
                )

                output_dir = "output"
                if not os.path.exists(output_dir):
                    os.makedirs(output_dir)

                person_name = resume_data.get("personalInfo", {}).get("name", "")
                company_name = session_data.get("companyName", "")
                position = session_data.get("position", "")
                latex_filename = generate_resume_filename(
                    person_name, company_name, position, sessionId, "tex"
                )
                latex_file_path = os.path.join(output_dir, latex_filename)

                with open(latex_file_path, "w", encoding="utf-8") as f:
                    f.write(latex_content)

                dbOps.updateSession(
                    userId,
                    sessionId,
                    {"latexFilePath": latex_file_path, "latexContent": latex_content},
                )
                print(f"LaTeX generated for session: {sessionId}")

            except Exception as latex_error:
                print(
                    f"Warning: LaTeX generation failed for session {sessionId}: {str(latex_error)}"
                )

        except Exception as workflow_error:
            print(f"Workflow failed for session {sessionId}: {str(workflow_error)}")
            errorUpdateData = {
                "status": "failed",
                "error": str(workflow_error),
                "failedAt": datetime.now().isoformat(),
            }
            dbOps.updateSession(userId, sessionId, errorUpdateData)

    except Exception as e:
        print(f"Background workflow error for session {sessionId}: {str(e)}")
        errorUpdateData = {
            "status": "failed",
            "error": str(e),
            "failedAt": datetime.now().isoformat(),
        }
        dbOps.updateSession(userId, sessionId, errorUpdateData)


async def run_workflow_background(userId: str, sessionId: str):
    """Async wrapper to run workflow in thread pool"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(thread_pool, run_workflow_sync, userId, sessionId)


@app.post("/fullWorkflow", response_model=WorkflowResponse)
async def fullWorkflowEndpoint(
    request: WorkflowSessionRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Start resume tailoring workflow in background"""
    try:
        session_data = dbOps.getSession(userId, request.sessionId)

        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        if session_data.get("status") == "processing":
            return WorkflowResponse(
                success=True,
                finalScore=0.0,
                pdfPath=None,
                iterationCount=0,
                message="Workflow is already in progress",
            )

        processingUpdateData = {
            "status": "processing",
            "startedAt": datetime.now().isoformat(),
        }
        dbOps.updateSession(userId, request.sessionId, processingUpdateData)

        asyncio.create_task(run_workflow_background(userId, request.sessionId))

        print(f"Workflow started in background thread for session: {request.sessionId}")

        return WorkflowResponse(
            success=True,
            finalScore=0.0,
            pdfPath=None,
            iterationCount=0,
            message="Workflow started successfully. Check status for updates.",
        )

    except Exception as e:
        print(f"Error starting workflow: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start workflow: {str(e)}"
        )


@app.get("/sessionStatus/{sessionId}")
async def getSessionStatusEndpoint(
    sessionId: str, userId: str = Depends(verifyFirebaseToken)
):
    """Get current status of a workflow session from Firebase"""
    try:
        session_data = dbOps.getSession(userId, sessionId)

        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")

        workflow_result = session_data.get("workflowResult", {})

        return {
            "sessionId": sessionId,
            "status": session_data.get("status", "created"),
            "companyName": session_data.get("companyName", ""),
            "position": session_data.get("position", ""),
            "currentScore": session_data.get("score", 0),
            "iterationCount": workflow_result.get("iteration_count", 0),
            "hasPdf": session_data.get("pdfFilePath") is not None,
            "hasLatex": session_data.get("latexFilePath") is not None,
            "startedAt": session_data.get("startedAt", ""),
            "completedAt": session_data.get("completedAt", ""),
            "error": session_data.get("error", ""),
        }

    except Exception as e:
        print(f"Error in getSessionStatus: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get session status: {str(e)}"
        )


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
        raise HTTPException(
            status_code=500, detail=f"Failed to delete session: {str(e)}"
        )


# Create Resume Endpoints
@app.post("/createResumeSession", response_model=CreateResumeResponse)
async def createResumeSessionEndpoint(
    request: CreateResumeRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Create a new resume session with job description"""
    try:
        sessionId = dbOps.createSession(userId, request.jobDescription)

        if sessionId:
            return CreateResumeResponse(
                success=True,
                sessionId=sessionId,
                message="Resume session created successfully",
                timestamp=datetime.now().isoformat(),
            )
        else:
            raise HTTPException(
                status_code=500, detail="Failed to create session in Firebase"
            )

    except Exception as e:
        print(f"Error creating resume session: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create resume session: {str(e)}"
        )


@app.get("/getResumeSessions", response_model=GetSessionsResponse)
async def getResumeSessionsEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Get all resume sessions for user"""
    try:
        sessions = dbOps.getAllSessions(userId)

        sessionList = []
        for session in sessions:
            sessionSummary = {
                "sessionId": session.get("sessionId", ""),
                "timestamp": session.get("timestamp", ""),
                "filePath": f"/sessions/{session.get('sessionId', '')}",
                "status": session.get("status", ""),
                "preview": (
                    session.get("jobDescription", "")[:200] + "..."
                    if len(session.get("jobDescription", "")) > 200
                    else session.get("jobDescription", "")
                ),
                "score": session.get("score", 0),
                "companyName": session.get("companyName", ""),
                "position": session.get("position", ""),
            }
            sessionList.append(sessionSummary)

        return GetSessionsResponse(
            success=True, sessions=sessionList, totalSessions=len(sessionList)
        )

    except Exception as e:
        print(f"Error fetching resume sessions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch resume sessions: {str(e)}"
        )


@app.get("/getResumeSession/{session_id}")
async def getResumeSessionEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Get specific resume session from Firebase"""
    try:
        sessionData = dbOps.getSession(userId, session_id)

        if not sessionData:
            raise HTTPException(status_code=404, detail="Resume session not found")

        if sessionData.get("latexFilePath") and os.path.exists(
            sessionData["latexFilePath"]
        ):
            with open(sessionData["latexFilePath"], "r", encoding="utf-8") as f:
                sessionData["latexContent"] = f.read()

        return {"success": True, "sessionData": sessionData}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in getResumeSession: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch resume session: {str(e)}"
        )


@app.delete("/deleteResumeSession/{session_id}")
async def deleteResumeSessionEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Delete a specific resume session from Firebase"""
    try:
        session_for_cleanup = dbOps.getSession(userId, session_id)

        success = dbOps.deleteSession(userId, session_id)

        if not success:
            raise HTTPException(status_code=404, detail="Resume session not found")

        try:
            if session_for_cleanup:
                person_name = (
                    session_for_cleanup.get("tailoredResume", {})
                    .get("personalInfo", {})
                    .get("name", "")
                )
                company_name = session_for_cleanup.get("companyName", "")
                position = session_for_cleanup.get("position", "")

                output_dir = "output"
                latex_filename = generate_resume_filename(
                    person_name, company_name, position, session_id, "tex"
                )
                pdf_filename = generate_resume_filename(
                    person_name, company_name, position, session_id, "pdf"
                )

                latex_file = os.path.join(output_dir, latex_filename)
                pdf_file = os.path.join(output_dir, pdf_filename)

                if os.path.exists(latex_file):
                    os.remove(latex_file)
                    print(f"Removed LaTeX file: {latex_file}")

                if os.path.exists(pdf_file):
                    os.remove(pdf_file)
                    print(f"Removed PDF file: {pdf_file}")

            output_dir = "output"
            fallback_latex = os.path.join(output_dir, f"resume_{session_id}.tex")
            fallback_pdf = os.path.join(output_dir, f"resume_{session_id}.pdf")

            if os.path.exists(fallback_latex):
                os.remove(fallback_latex)
                print(f"Removed fallback LaTeX file: {fallback_latex}")

            if os.path.exists(fallback_pdf):
                os.remove(fallback_pdf)
                print(f"Removed fallback PDF file: {fallback_pdf}")

        except Exception as cleanup_error:
            print(f"Warning: File cleanup failed: {str(cleanup_error)}")

        return {"success": True, "message": "Resume session deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting resume session: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete resume session: {str(e)}"
        )


@app.post("/generateLatex/{session_id}", response_model=GenerateLatexResponse)
async def generateLatexEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Generate LaTeX file from Firebase session data"""
    try:
        session_data = dbOps.getSession(userId, session_id)

        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        if session_data.get("status") != "completed" or not session_data.get(
            "tailoredResume"
        ):
            raise HTTPException(
                status_code=400,
                detail="Session not completed or no tailored resume data available",
            )

        from resume_templates import generate_complete_resume_template

        # Get location from session data
        location = session_data.get("location", "Open to Relocation")
        latex_content = generate_complete_resume_template(
            session_data["tailoredResume"], location
        )

        output_dir = "output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        person_name = (
            session_data.get("tailoredResume", {})
            .get("personalInfo", {})
            .get("name", "")
        )
        company_name = session_data.get("companyName", "")
        position = session_data.get("position", "")
        latex_filename = generate_resume_filename(
            person_name, company_name, position, session_id, "tex"
        )
        latex_file_path = os.path.join(output_dir, latex_filename)

        with open(latex_file_path, "w", encoding="utf-8") as f:
            f.write(latex_content)

        updateData = {"latexFilePath": latex_file_path, "latexContent": latex_content}
        dbOps.updateSession(userId, session_id, updateData)

        return GenerateLatexResponse(
            success=True,
            latexFilePath=latex_file_path,
            message="LaTeX file generated successfully",
        )

    except Exception as e:
        print(f"Error generating LaTeX: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate LaTeX file: {str(e)}"
        )


@app.get("/downloadPDF/{session_id}")
async def downloadPDFEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Download PDF from Firebase session data"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        latex_file_path = session_data.get("latexFilePath")
        if not latex_file_path or not os.path.exists(latex_file_path):
            print(
                f"LaTeX file not found for session {session_id}, generating it first..."
            )
            if session_data.get("status") != "completed" or not session_data.get(
                "tailoredResume"
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Session not completed or no tailored resume data available",
                )

            from resume_templates import generate_complete_resume_template

            # Get location from session data
            location = session_data.get("location", "Open to Relocation")
            latex_content = generate_complete_resume_template(
                session_data["tailoredResume"], location
            )

            output_dir = "output"
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)

            person_name = (
                session_data.get("tailoredResume", {})
                .get("personalInfo", {})
                .get("name", "")
            )
            company_name = session_data.get("companyName", "")
            position = session_data.get("position", "")
            latex_filename = generate_resume_filename(
                person_name, company_name, position, session_id, "tex"
            )
            latex_file_path = os.path.join(output_dir, latex_filename)

            with open(latex_file_path, "w", encoding="utf-8") as f:
                f.write(latex_content)

            updateData = {
                "latexFilePath": latex_file_path,
                "latexContent": latex_content,
            }
            dbOps.updateSession(userId, session_id, updateData)
            print(f"LaTeX file generated successfully: {latex_file_path}")

        from latex2pdf import compile_latex

        output_dir = os.path.dirname(latex_file_path)

        try:
            compile_latex(latex_file_path, output_dir)
        except Exception as compile_error:
            print(f"LaTeX compilation failed: {str(compile_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"LaTeX compilation failed: {str(compile_error)}",
            )

        person_name = (
            session_data.get("tailoredResume", {})
            .get("personalInfo", {})
            .get("name", "")
        )
        company_name = session_data.get("companyName", "")
        position = session_data.get("position", "")
        pdf_filename = generate_resume_filename(
            person_name, company_name, position, session_id, "pdf"
        )
        pdf_file_path = os.path.join(output_dir, pdf_filename)

        if not os.path.exists(pdf_file_path):
            print(f"PDF file not found after compilation: {pdf_file_path}")
            raise HTTPException(
                status_code=500,
                detail="PDF generation failed. The LaTeX file could not be compiled to PDF. Please check the LaTeX content for errors.",
            )

        dbOps.updateSession(userId, session_id, {"pdfFilePath": pdf_file_path})
        print(f"PDF generated successfully: {pdf_file_path}")

        return FileResponse(
            path=pdf_file_path, media_type="application/pdf", filename=pdf_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")


@app.get("/downloadLatex/{session_id}")
async def downloadLatexEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Download LaTeX file from Firebase session data"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        latex_file_path = session_data.get("latexFilePath")
        if not latex_file_path or not os.path.exists(latex_file_path):
            latex_content = session_data.get("latexContent")
            if latex_content:
                output_dir = "output"
                if not os.path.exists(output_dir):
                    os.makedirs(output_dir)

                person_name = (
                    session_data.get("tailoredResume", {})
                    .get("personalInfo", {})
                    .get("name", "")
                )
                company_name = session_data.get("companyName", "")
                position = session_data.get("position", "")
                latex_filename = generate_resume_filename(
                    person_name, company_name, position, session_id, "tex"
                )
                latex_file_path = os.path.join(output_dir, latex_filename)

                with open(latex_file_path, "w", encoding="utf-8") as f:
                    f.write(latex_content)

                dbOps.updateSession(
                    userId, session_id, {"latexFilePath": latex_file_path}
                )
            else:
                raise HTTPException(status_code=404, detail="LaTeX file not found")

        person_name = (
            session_data.get("tailoredResume", {})
            .get("personalInfo", {})
            .get("name", "")
        )
        company_name = session_data.get("companyName", "")
        position = session_data.get("position", "")
        latex_filename = generate_resume_filename(
            person_name, company_name, position, session_id, "tex"
        )

        return FileResponse(
            path=latex_file_path,
            media_type="application/x-tex",
            filename=latex_filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading LaTeX: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to download LaTeX: {str(e)}"
        )


# API Config Endpoints
@app.post("/apiConfig", response_model=ApiConfigResponse)
async def updateApiConfigEndpoint(
    request: ApiConfigRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Save user API configuration to Firebase"""
    try:
        from datetime import datetime
        
        apiData = {
            "apiKey": request.apiKey,
            "timestamp": datetime.now().isoformat()
        }

        success = dbOps.updateUserApiConfig(userId, apiData)

        if success:
            return ApiConfigResponse(
                success=True, 
                message="API configuration saved successfully",
                lastUpdated=apiData["timestamp"]
            )
        else:
            raise HTTPException(
                status_code=500, detail="Failed to save API configuration to Firebase"
            )

    except Exception as e:
        print(f"Error saving API config: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to save API configuration: {str(e)}"
        )


@app.get("/apiConfig", response_model=GetApiConfigResponse)
async def getApiConfigEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Get user API configuration from Firebase"""
    try:
        apiData = dbOps.getUserApiConfig(userId)

        if apiData is None:
            return GetApiConfigResponse(
                success=True,
                apiData={},
                message="No API configuration found"
            )

        # Don't return the actual API key for security
        safeApiData = {
            "hasApiKey": bool(apiData.get("apiKey")),
            "timestamp": apiData.get("timestamp", ""),
            "lastUpdated": apiData.get("timestamp", "")
        }

        return GetApiConfigResponse(
            success=True,
            apiData=safeApiData,
            message="API configuration retrieved successfully"
        )

    except Exception as e:
        print(f"Error getting API config: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get API configuration: {str(e)}"
        )
if __name__ == "__main__":
    import uvicorn

    print("Starting Resume Forge API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)
