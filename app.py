from fastapi import FastAPI, HTTPException, Depends, Query
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
from pipeline_processor import (
    start_pipeline_processor,
    stop_pipeline_processor,
    get_pipeline_status,
    cleanup_on_startup,
)
from addressFinder import findAddressesForLocation

app = FastAPI(
    title="Resume Forge API",
    description="AI-powered resume tailoring service",
    version="1.0.0",
)

thread_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="workflow_")


@app.on_event("startup")
async def startup_event():
    """Initialize pipeline processor and cleanup on startup"""
    print("Starting Resume Forge API...")

    cleanup_count = cleanup_on_startup()
    print(f"Cleaned up {cleanup_count} processing sessions from previous runs")

    start_pipeline_processor()
    print("Pipeline processor started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("Shutting down Resume Forge API...")
    stop_pipeline_processor()
    print("Pipeline processor stopped")


def generate_resume_filename(
    person_name: str, company_name: str, position: str, session_id: str, extension: str
) -> str:
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
        "http://localhost:5174",
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
    selectedProvider: Optional[str] = "openai"


class CompanyPositionResponse(BaseModel):
    companyName: str
    position: str


class ResumeUpdateResponse(BaseModel):
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


# Create Resume Models
class CreateResumeRequest(BaseModel):
    jobDescription: str
    jobTitle: Optional[str] = ""
    companyName: Optional[str] = ""
    selectedProvider: Optional[str] = "openai"


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


class GetPaginatedSessionsResponse(BaseModel):
    success: bool
    sessions: list
    totalSessions: int
    currentPage: int
    pageSize: int
    totalPages: int
    hasNextPage: bool
    hasPreviousPage: bool


class GenerateLatexResponse(BaseModel):
    success: bool
    latexFilePath: Optional[str]
    message: str


# API Config Models
class ApiConfigRequest(BaseModel):
    openAiKey: Optional[str] = None
    groqKey: Optional[str] = None
    googleGenAiKey: Optional[str] = None
    selectedProvider: Optional[str] = None


class ApiConfigResponse(BaseModel):
    success: bool
    message: str
    lastUpdated: Optional[str] = None


class GetApiConfigResponse(BaseModel):
    success: bool
    apiData: Dict[str, Any]
    message: str


class PipelineStatusResponse(BaseModel):
    success: bool
    status: Dict[str, int]
    message: str


class QueueSessionRequest(BaseModel):
    sessionId: str


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
            "message": "Global counter retrieved successfully",
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
            "message": "Individual counter retrieved successfully",
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
            "message": "RBAC status retrieved successfully",
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
                "skippedCount": 0,
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
            "totalProcessed": len(users_without_tier),
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
                "summary": "",
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
async def extractCompanyInfoEndpoint(
    request: JobDescriptionRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Extract company name and position from job description"""
    try:
        # Get user data to determine tier
        user_data = dbOps.getUser(userId)
        user_tier = user_data.get("accountTier", "FREE") if user_data else "FREE"

        state = {
            "job_description": request.jobDescription,
            "resume": "",
            "user_id": userId,
            "user_tier": user_tier,
        }

        result = extract_info(state)

        return CompanyPositionResponse(
            companyName=result["company_name"], position=result["position"]
        )

    except Exception as e:
        print(f"Error in extractCompanyInfo: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract company info: {str(e)}"
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

        # Get user tier
        user_tier = user_data.get("accountTier", "FREE") if user_data else "FREE"
        print(f"User {userId} tier: {user_tier}")

        combined_data = {
            "sessionId": sessionId,
            "jobDescription": job_description,
            **resume_data,
        }

        try:
            selected_provider = session_data.get("selectedProvider", "openai")
            print(f"Background workflow using provider: {selected_provider}")
            
            workflow_input = {
                "resume_data": combined_data,
                "user_id": userId,
                "user_tier": user_tier,
                "selected_provider": selected_provider,
            }

            result = workflow(workflow_input)

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

                location = result.get("location", "Open to Relocation")
                latex_content = generate_complete_resume_template(
                    tailored_resume.get("resumeData", {}), location
                )

                output_dir = "output"
                if not os.path.exists(output_dir):
                    os.makedirs(output_dir)

                person_name = resume_data.get("personalInfo", {}).get("name", "")
                if not person_name:
                    print(f"Warning: No person name found in profile for user {userId}")
                    person_name = "Unknown"
                
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
            error_msg = str(workflow_error)
            print(f"Workflow failed for session {sessionId}: {error_msg}")

            # Handle API key errors specifically
            if "API_KEY_ERROR" in error_msg:
                errorUpdateData = {
                    "status": "failed",
                    "error": "API_KEY_ERROR: API key authentication failed. Please verify your OpenAI API key is correct.",
                    "errorType": "API_KEY_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }
            elif "MODEL_ERROR" in error_msg:
                errorUpdateData = {
                    "status": "failed",
                    "error": "MODEL_ERROR: Error occurred in AI model processing.",
                    "errorType": "MODEL_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }
            else:
                errorUpdateData = {
                    "status": "failed",
                    "error": error_msg,
                    "errorType": "WORKFLOW_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }

            dbOps.updateSession(userId, sessionId, errorUpdateData)

    except Exception as e:
        print(f"Critical error in run_workflow_sync for session {sessionId}: {str(e)}")
        try:
            errorUpdateData = {
                "status": "failed",
                "error": f"Critical error: {str(e)}",
                "errorType": "CRITICAL_ERROR",
                "failedAt": datetime.now().isoformat(),
            }
            dbOps.updateSession(userId, sessionId, errorUpdateData)
        except Exception as update_error:
            print(f"Failed to update session with error: {str(update_error)}")


async def run_workflow_background(userId: str, sessionId: str):
    """Async wrapper to run workflow in thread pool"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(thread_pool, run_workflow_sync, userId, sessionId)


@app.post("/fullWorkflow", response_model=WorkflowResponse)
async def fullWorkflowEndpoint(
    request: WorkflowSessionRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Queue resume tailoring workflow for processing"""
    try:
        session_data = dbOps.getSession(userId, request.sessionId)

        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        # Get user data to check tier and API keys
        user_data = dbOps.getUser(userId)
        user_tier = user_data.get("accountTier", "FREE") if user_data else "FREE"

        # Get API config and selected provider from database
        api_config = dbOps.getUserApiConfig(userId)
        selected_provider = (
            api_config.get("selectedProvider", "") if api_config else ""
        ) or "openai"
        print(
            f"Processing workflow with provider from DB: {selected_provider} for user tier: {user_tier}"
        )

        # Validate API keys for FREE users
        if user_tier == "FREE":
            if selected_provider == "openai":
                if not api_config or not api_config.get("openAiKey"):
                    raise HTTPException(
                        status_code=400,
                        detail="API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue.",
                    )
            elif selected_provider == "groq-google":
                if (
                    not api_config
                    or not api_config.get("groqKey")
                    or not api_config.get("googleGenAiKey")
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="API_KEY_ERROR: Please add both Groq and Google Gen AI API keys in the API Config section to continue.",
                    )

        if session_data.get("status") == "processing":
            return WorkflowResponse(
                success=True,
                finalScore=0.0,
                pdfPath=None,
                iterationCount=0,
                message="Workflow is already in progress",
            )

        if session_data.get("status") == "queued":
            return WorkflowResponse(
                success=True,
                finalScore=0.0,
                pdfPath=None,
                iterationCount=0,
                message="Workflow is already queued for processing",
            )

        # Add session to pipeline
        job_description = session_data.get("jobDescription", "")
        pipeline_added = dbOps.addToPipeline(
            userId, request.sessionId, job_description, selected_provider
        )

        if not pipeline_added:
            raise HTTPException(
                status_code=500, detail="Failed to add session to processing queue"
            )

        # Update session status to queued and store selected provider
        queuedUpdateData = {
            "status": "queued",
            "queuedAt": datetime.now().isoformat(),
            "selectedProvider": selected_provider,
        }
        dbOps.updateSession(userId, request.sessionId, queuedUpdateData)

        print(f"Session {request.sessionId} queued for processing")

        return WorkflowResponse(
            success=True,
            finalScore=0.0,
            pdfPath=None,
            iterationCount=0,
            message="Workflow queued successfully. Check status for updates.",
        )

    except Exception as e:
        print(f"Error queuing workflow: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to queue workflow: {str(e)}"
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
            "errorType": session_data.get("errorType", ""),
        }

    except Exception as e:
        print(f"Error in getSessionStatus: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get session status: {str(e)}"
        )


# Create Resume Endpoints
@app.post("/createResumeSession", response_model=CreateResumeResponse)
async def createResumeSessionEndpoint(
    request: CreateResumeRequest, userId: str = Depends(verifyFirebaseToken)
):
    """Create a new resume session with job description"""
    try:
        # Get selected provider from database
        api_config = dbOps.getUserApiConfig(userId)
        selected_provider = (
            api_config.get("selectedProvider", "") if api_config else ""
        ) or "openai"
        print(f"Creating session with provider from DB: {selected_provider}")
        sessionId = dbOps.createSession(
            userId, request.jobDescription, selected_provider
        )

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


@app.get("/getPaginatedResumeSessions", response_model=GetPaginatedSessionsResponse)
async def getPaginatedResumeSessionsEndpoint(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    pageSize: int = Query(
        10, ge=1, le=10000, description="Number of sessions per page (max 10000)"
    ),
    userId: str = Depends(verifyFirebaseToken),
):
    """Get paginated resume sessions for user"""
    try:
        paginatedData = dbOps.getPaginatedSessions(userId, page, pageSize)

        sessionList = []
        for session in paginatedData["sessions"]:
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

        return GetPaginatedSessionsResponse(
            success=True,
            sessions=sessionList,
            totalSessions=paginatedData["totalSessions"],
            currentPage=paginatedData["currentPage"],
            pageSize=paginatedData["pageSize"],
            totalPages=paginatedData["totalPages"],
            hasNextPage=paginatedData["hasNextPage"],
            hasPreviousPage=paginatedData["hasPreviousPage"],
        )

    except Exception as e:
        print(f"Error fetching paginated resume sessions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch paginated resume sessions: {str(e)}",
        )


@app.get("/searchResumeSessions")
async def searchResumeSessionsEndpoint(
    query: str = Query(..., description="Search query for company name or position"),
    userId: str = Depends(verifyFirebaseToken),
):
    """Search resume sessions by company name or position"""
    try:
        searchResults = dbOps.searchSessions(userId, query)

        sessionList = []
        for session in searchResults:
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

        return {
            "success": True,
            "sessions": sessionList,
            "totalSessions": len(sessionList),
            "searchQuery": query,
            "message": f"Found {len(sessionList)} sessions matching '{query}'",
        }

    except Exception as e:
        print(f"Error searching resume sessions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to search resume sessions: {str(e)}"
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
                user_data = dbOps.getUser(userId)
                person_name = (
                    user_data.get("profile", {})
                    .get("personalInfo", {})
                    .get("name", "")
                ) if user_data else ""
                
                if not person_name:
                    print(f"Warning: No person name found in profile for user {userId}")
                    person_name = "Unknown"
                
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

        location = session_data.get("location", "Open to Relocation")
        latex_content = generate_complete_resume_template(
            session_data["tailoredResume"], location
        )

        output_dir = "output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        user_data = dbOps.getUser(userId)
        person_name = (
            user_data.get("profile", {})
            .get("personalInfo", {})
            .get("name", "")
        ) if user_data else ""
        
        if not person_name:
            print(f"Warning: No person name found in profile for user {userId}")
            person_name = "Unknown"
        
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

            user_data = dbOps.getUser(userId)
            person_name = (
                user_data.get("profile", {})
                .get("personalInfo", {})
                .get("name", "")
            ) if user_data else ""
            
            if not person_name:
                print(f"Warning: No person name found in profile for user {userId}")
                person_name = "Unknown"
            
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

        user_data = dbOps.getUser(userId)
        person_name = (
            user_data.get("profile", {})
            .get("personalInfo", {})
            .get("name", "")
        ) if user_data else ""
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

                user_data = dbOps.getUser(userId)
                person_name = (
                    user_data.get("profile", {})
                    .get("personalInfo", {})
                    .get("name", "")
                ) if user_data else ""
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

        user_data = dbOps.getUser(userId)
        person_name = (
            user_data.get("profile", {})
            .get("personalInfo", {})
            .get("name", "")
        ) if user_data else ""
        
        if not person_name:
            print(f"Warning: No person name found in profile for user {userId}")
            person_name = "Unknown"
        
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

        # Get existing API configuration to merge with new keys
        existingApiData = dbOps.getUserApiConfig(userId) or {}

        # Build API data by merging existing keys with new ones
        # Only update keys that are provided in the request
        apiData = {
            "openAiKey": (
                request.openAiKey
                if request.openAiKey is not None
                else existingApiData.get("openAiKey", "")
            ),
            "groqKey": (
                request.groqKey
                if request.groqKey is not None
                else existingApiData.get("groqKey", "")
            ),
            "googleGenAiKey": (
                request.googleGenAiKey
                if request.googleGenAiKey is not None
                else existingApiData.get("googleGenAiKey", "")
            ),
            "selectedProvider": (
                request.selectedProvider
                if request.selectedProvider is not None
                else existingApiData.get("selectedProvider", "")
            ),
            "timestamp": datetime.now().isoformat(),
        }

        success = dbOps.updateUserApiConfig(userId, apiData)

        if success:
            return ApiConfigResponse(
                success=True,
                message="API configuration saved successfully",
                lastUpdated=apiData["timestamp"],
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
                apiData={
                    "openAiKey": "",
                    "groqKey": "",
                    "googleGenAiKey": "",
                    "selectedProvider": "",
                    "hasOpenAiKey": False,
                    "hasGroqKey": False,
                    "hasGoogleGenAiKey": False,
                    "timestamp": "",
                    "lastUpdated": "",
                },
                message="No API configuration found",
            )

        # Return the actual API keys for display in input fields
        # This is secure as it's only accessible to the authenticated user
        safeApiData = {
            "openAiKey": apiData.get("openAiKey", ""),
            "groqKey": apiData.get("groqKey", ""),
            "googleGenAiKey": apiData.get("googleGenAiKey", ""),
            "selectedProvider": apiData.get("selectedProvider", ""),
            "hasOpenAiKey": bool(apiData.get("openAiKey")),
            "hasGroqKey": bool(apiData.get("groqKey")),
            "hasGoogleGenAiKey": bool(apiData.get("googleGenAiKey")),
            "timestamp": apiData.get("timestamp", ""),
            "lastUpdated": apiData.get("timestamp", ""),
        }

        return GetApiConfigResponse(
            success=True,
            apiData=safeApiData,
            message="API configuration retrieved successfully",
        )

    except Exception as e:
        print(f"Error getting API config: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get API configuration: {str(e)}"
        )


class UserInfoResponse(BaseModel):
    success: bool
    accountTier: str
    email: str
    displayName: str
    message: str


@app.get("/user/info", response_model=UserInfoResponse)
async def getUserInfoEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Get current user information including account tier"""
    try:
        userData = dbOps.getUser(userId)

        if not userData:
            raise HTTPException(status_code=404, detail="User not found")

        return UserInfoResponse(
            success=True,
            accountTier=userData.get("accountTier", "FREE"),
            email=userData.get("email", ""),
            displayName=userData.get("displayName", ""),
            message="User information retrieved successfully",
        )
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get user information: {str(e)}"
        )


# Pipeline Management Endpoints
@app.get("/pipeline/status", response_model=PipelineStatusResponse)
async def getPipelineStatusEndpoint():
    """Get current pipeline status"""
    try:
        status = get_pipeline_status()
        return PipelineStatusResponse(
            success=True,
            status=status,
            message="Pipeline status retrieved successfully",
        )
    except Exception as e:
        print(f"Error getting pipeline status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get pipeline status: {str(e)}"
        )


@app.get("/pipeline/user-sessions", response_model=GetSessionsResponse)
async def getUserPipelineSessionsEndpoint(userId: str = Depends(verifyFirebaseToken)):
    """Get user's active sessions in the pipeline"""
    try:
        active_sessions = dbOps.getActivePipelineSessions(userId)

        # Convert pipeline sessions to the expected format
        sessions = []
        for session in active_sessions:
            session_data = dbOps.getSession(userId, session["sessionId"])
            if session_data:
                sessions.append(session_data)

        return GetSessionsResponse(
            success=True, sessions=sessions, totalSessions=len(sessions)
        )
    except Exception as e:
        print(f"Error getting user pipeline sessions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get user pipeline sessions: {str(e)}"
        )


@app.post("/updateSessionJson/{session_id}")
async def updateSessionJsonEndpoint(
    session_id: str, request: dict, userId: str = Depends(verifyFirebaseToken)
):
    """Update the tailored resume JSON data for a session"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        # Get the new JSON data from the request
        new_tailored_resume = request.get("tailoredResume")
        if not new_tailored_resume:
            raise HTTPException(
                status_code=400, detail="No tailored resume data provided"
            )

        # Update the session with the new JSON data
        updateData = {
            "tailoredResume": new_tailored_resume,
            "lastUpdated": datetime.now().isoformat(),
        }

        success = dbOps.updateSession(userId, session_id, updateData)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update session data")

        return {"success": True, "message": "Session JSON updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating session JSON: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update session JSON: {str(e)}"
        )


@app.post("/mergeSkills/{session_id}")
async def mergeSkillsEndpoint(session_id: str, userId: str = Depends(verifyFirebaseToken)):
    try:
        import re
        
        charLimit = 115  # Maximum characters allowed per skills category (category name + skills)
        
        sessionData = dbOps.getSession(userId, session_id)
        if not sessionData or not sessionData.get("tailoredResume"):
            raise HTTPException(status_code=404, detail="Resume session not found")

        userData = dbOps.getUser(userId)
        if not userData or not userData.get("profile"):
            raise HTTPException(status_code=400, detail="No user profile data found")

        personalSkills = userData["profile"].get("technicalSkillsCategories", [])
        aiSkills = sessionData["tailoredResume"].get("technicalSkillsCategories", [])
        
        if not personalSkills or not aiSkills:
            return {"success": True, "message": "No skills to merge"}

        mergedSkills = []
        
        for aiCategory in aiSkills:
            categoryName = aiCategory.get("categoryName", "").strip()
            skillsText = aiCategory.get("skills", "").strip()
            
            if not categoryName or not skillsText:
                continue
                
            cleanedSkillsText = re.sub(r'\s*\([^)]*\)', '', skillsText)
            skillsList = [skill.strip() for skill in cleanedSkillsText.split(",") if skill.strip()]
            
            personalCategory = next((cat for cat in personalSkills 
                                   if cat.get("categoryName", "").strip().lower() == categoryName.lower()), None)
            
            if personalCategory:
                personalSkillsList = [skill.strip() for skill in personalCategory.get("skills", "").split(",") if skill.strip()]
                currentLength = len(categoryName) + len(cleanedSkillsText)
                
                if currentLength < charLimit:
                    for personalSkill in personalSkillsList:
                        if personalSkill not in skillsList:
                            skillWithSeparator = f", {personalSkill}" if skillsList else personalSkill
                            potentialLength = currentLength + len(skillWithSeparator)
                            
                            if currentLength < charLimit:
                                skillsList.append(personalSkill)
                                currentLength = potentialLength
                            else:
                                break
            
            mergedCategory = aiCategory.copy()
            mergedCategory["skills"] = ", ".join(skillsList)
            mergedSkills.append(mergedCategory)

        updatedTailoredResume = sessionData["tailoredResume"].copy()
        updatedTailoredResume["technicalSkillsCategories"] = mergedSkills

        updateData = {
            "tailoredResume": updatedTailoredResume,
            "lastUpdated": datetime.now().isoformat(),
        }

        success = dbOps.updateSession(userId, session_id, updateData)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update session")

        return {"success": True, "mergedSkills": mergedSkills}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to merge skills: {str(e)}")


# Questions Endpoints
@app.post("/sessions/{session_id}/questions")
async def addQuestionEndpoint(
    session_id: str, request: dict, userId: str = Depends(verifyFirebaseToken)
):
    """Add a new question to a session"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        question = request.get("question")
        if not question:
            raise HTTPException(status_code=400, detail="Question text is required")

        # For now, provide a dummy answer
        dummy_answer = "This is a placeholder answer. The LLM integration will be implemented lateraceholder answer. The LLM integration will be implemented later to provide detailed, contextual responses based on the job description and resume content."

        question_id = dbOps.addQuestion(userId, session_id, question, dummy_answer)
        if not question_id:
            raise HTTPException(status_code=500, detail="Failed to add question")

        return {
            "success": True,
            "questionId": question_id,
            "message": "Question added successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add question: {str(e)}")


@app.get("/sessions/{session_id}/questions")
async def getQuestionsEndpoint(
    session_id: str, userId: str = Depends(verifyFirebaseToken)
):
    """Get all questions for a session"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        questions = dbOps.getQuestions(userId, session_id)

        return {
            "success": True,
            "questions": questions,
            "message": "Questions retrieved successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting questions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get questions: {str(e)}"
        )


@app.post("/sessions/{session_id}/questions/{question_id}/answer")
async def answerQuestionEndpoint(
    session_id: str,
    question_id: str,
    request: dict,
    userId: str = Depends(verifyFirebaseToken),
):
    """Answer a specific question"""
    try:
        session_data = dbOps.getSession(userId, session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Resume session not found")

        answer = request.get("answer")
        if not answer:
            raise HTTPException(status_code=400, detail="Answer text is required")

        success = dbOps.updateQuestionAnswer(userId, session_id, question_id, answer)
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to update question answer"
            )

        return {"success": True, "message": "Question answered successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error answering question: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to answer question: {str(e)}"
        )


@app.post("/api/find-addresses")
async def findAddressesEndpoint(request: dict):
    """Find addresses for a given location"""
    try:
        location = request.get("location")
        if not location:
            raise HTTPException(status_code=400, detail="Location is required")

        # Call the address finder function
        result = findAddressesForLocation(location)

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error finding addresses: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to find addresses: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    print("Starting Resume Forge API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)
