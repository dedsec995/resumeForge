import asyncio
import threading
import time
from datetime import datetime
from typing import Optional
from database_operations import dbOps
from agent import workflow
import os
import re
from resume_templates import generate_complete_resume_template


class PipelineProcessor:
    def __init__(self):
        self.is_running = False
        self.processing_thread = None
        self.lock = threading.Lock()

    def start(self):
        """Start the pipeline processor"""
        if not self.is_running:
            self.is_running = True
            self.processing_thread = threading.Thread(
                target=self._process_loop, daemon=True
            )
            self.processing_thread.start()
            print("Pipeline processor started")

    def stop(self):
        """Stop the pipeline processor"""
        self.is_running = False
        if self.processing_thread:
            self.processing_thread.join(timeout=5)
        print("Pipeline processor stopped")

    def _process_loop(self):
        """Main processing loop - runs in a separate thread"""
        while self.is_running:
            try:
                # Get next session from pipeline
                next_session = dbOps.getNextSessionFromPipeline()

                if next_session:
                    print(f"Processing session: {next_session['sessionId']}")
                    self._process_session(next_session)
                else:
                    # No sessions in queue, sleep for a bit
                    time.sleep(2)

            except Exception as e:
                print(f"Error in pipeline processing loop: {e}")
                time.sleep(5)  # Wait a bit before retrying

    def _process_session(self, session_data: dict):
        """Process a single session"""
        session_id = session_data["sessionId"]
        user_id = session_data["userId"]
        job_description = session_data["jobDescription"]

        try:
            # Update pipeline status to processing
            dbOps.updatePipelineSessionStatus(session_id, "processing")

            # Update session status to processing
            dbOps.updateSession(
                user_id,
                session_id,
                {"status": "processing", "startedAt": datetime.now().isoformat()},
            )

            # Get user data
            user_data = dbOps.getUser(user_id)
            resume_data = {}
            if user_data and user_data.get("profile"):
                resume_data = user_data["profile"]
            else:
                print(f"Warning: No profile data found for user: {user_id}")
                resume_data = {}

            # Get user tier
            user_tier = user_data.get("accountTier", "FREE") if user_data else "FREE"
            print(f"User {user_id} tier: {user_tier}")

            # ===== TESTING MODE (COMMENTED OUT) =====
            # Uncomment the lines below to enable testing mode with 10-second delay
            # self._processSessionTestMode(session_id, user_id, job_description, resume_data, user_tier)
            # return

            # ===== PRODUCTION MODE (ACTIVE) =====
            # Run the actual AI workflow
            print(
                f"🚀 PRODUCTION MODE: Running AI workflow for session {session_id}..."
            )

            combined_data = {
                "sessionId": session_id,
                "jobDescription": job_description,
                **resume_data,
            }

            # Get selected provider from session data
            selected_provider = session_data.get("selectedProvider", "openai")
            print(
                f"Session data selectedProvider: {session_data.get('selectedProvider')}"
            )
            print(
                f"Pipeline processing session {session_id} with provider: {selected_provider}"
            )

            # Run the workflow
            workflow_input = {
                "resume_data": combined_data,
                "user_id": user_id,
                "user_tier": user_tier,
                "selected_provider": selected_provider,
            }

            result = workflow(workflow_input)

            score = result.get("score", 0.0)
            company_name = result.get("company_name", "")
            position = result.get("position", "")
            tailored_resume = result.get("tailored_resume_data", {})

            print(
                f"Workflow completed for session {session_id}: Score {score}/100, Company: {company_name}, Position: {position}"
            )

            # Update session with results
            update_data = {
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

            dbOps.updateSession(user_id, session_id, update_data)

            # Generate LaTeX
            try:
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
                latex_filename = self._generate_resume_filename(
                    person_name, company_name, position, session_id, "tex"
                )
                latex_file_path = os.path.join(output_dir, latex_filename)

                with open(latex_file_path, "w", encoding="utf-8") as f:
                    f.write(latex_content)

                dbOps.updateSession(
                    user_id,
                    session_id,
                    {"latexFilePath": latex_file_path, "latexContent": latex_content},
                )
                print(f"LaTeX generated for session: {session_id}")

            except Exception as latex_error:
                print(
                    f"Warning: LaTeX generation failed for session {session_id}: {str(latex_error)}"
                )

            # Update pipeline status to completed
            dbOps.updatePipelineSessionStatus(session_id, "completed")

            # Remove from pipeline
            dbOps.removeFromPipeline(session_id)

            print(f"Session {session_id} completed successfully")

        except Exception as e:
            error_msg = str(e)
            print(f"Workflow failed for session {session_id}: {error_msg}")

            # Handle different error types
            if "API_KEY_ERROR" in error_msg:
                error_update_data = {
                    "status": "failed",
                    "error": "API_KEY_ERROR: API key authentication failed. Please verify your OpenAI API key is correct.",
                    "errorType": "API_KEY_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }
            elif "MODEL_ERROR" in error_msg:
                error_update_data = {
                    "status": "failed",
                    "error": "MODEL_ERROR: Error occurred in AI model processing.",
                    "errorType": "MODEL_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }
            else:
                error_update_data = {
                    "status": "failed",
                    "error": error_msg,
                    "errorType": "WORKFLOW_ERROR",
                    "failedAt": datetime.now().isoformat(),
                }

            # Update session with error
            dbOps.updateSession(user_id, session_id, error_update_data)

            # Update pipeline status to failed
            dbOps.updatePipelineSessionStatus(
                session_id,
                "failed",
                {
                    "error": error_msg,
                    "errorType": error_update_data.get("errorType", "WORKFLOW_ERROR"),
                },
            )

            # Remove from pipeline
            dbOps.removeFromPipeline(session_id)

    def _processSessionTestMode(
        self,
        session_id: str,
        user_id: str,
        job_description: str,
        resume_data: dict,
        user_tier: str,
    ):
        """Test mode function with 10-second delay and mock results"""
        try:
            # TESTING MODE: Sleep for 10 seconds instead of running actual workflow
            print(f"🧪 TESTING MODE: Processing session {session_id} for 10 seconds...")
            import time

            time.sleep(20)
            print(f"✅ TESTING MODE: Session {session_id} processing completed!")

            # Mock successful result for testing
            score = 85.0  # Mock score
            company_name = "Test Company"
            position = "Test Position"

            print(
                f"Workflow completed for session {session_id}: Score {score}/100, Company: {company_name}, Position: {position}"
            )

            # Update session with mock results
            update_data = {
                "workflowResult": {
                    "score": score,
                    "company_name": company_name,
                    "position": position,
                    "location": "Test Location",
                    "feedback": "This is a test result for pipeline testing",
                    "downsides": "No downsides in test mode",
                    "iteration_count": 1,
                },
                "tailoredResume": {
                    "resumeData": {
                        "personalInfo": {"name": "Test User"},
                        "summary": "Test resume summary",
                        "experience": [
                            {"title": "Test Role", "company": "Test Company"}
                        ],
                        "education": [
                            {"degree": "Test Degree", "school": "Test University"}
                        ],
                        "skills": ["Test Skill 1", "Test Skill 2"],
                    }
                },
                "status": "completed",
                "completedAt": datetime.now().isoformat(),
                "score": score,
                "companyName": company_name,
                "position": position,
                "location": "Test Location",
            }

            dbOps.updateSession(user_id, session_id, update_data)

            # Update pipeline status to completed
            dbOps.updatePipelineSessionStatus(session_id, "completed")

            # Remove from pipeline
            dbOps.removeFromPipeline(session_id)

            print(f"Session {session_id} completed successfully")

        except Exception as e:
            error_msg = str(e)
            print(f"Test workflow failed for session {session_id}: {error_msg}")

            # Handle errors in test mode
            error_update_data = {
                "status": "failed",
                "error": f"Test mode error: {error_msg}",
                "errorType": "TEST_ERROR",
                "failedAt": datetime.now().isoformat(),
            }

            # Update session with error
            dbOps.updateSession(user_id, session_id, error_update_data)

            # Update pipeline status to failed
            dbOps.updatePipelineSessionStatus(
                session_id, "failed", {"error": error_msg, "errorType": "TEST_ERROR"}
            )

            # Remove from pipeline
            dbOps.removeFromPipeline(session_id)

    def _generate_resume_filename(
        self,
        person_name: str,
        company_name: str,
        position: str,
        session_id: str,
        extension: str,
    ) -> str:
        """Generate resume filename using person name, company name and position, with spaces replaced by underscores"""
        try:
            clean_person = (
                re.sub(r"[^\w\s-]", "", person_name.strip()) if person_name else ""
            )
            clean_company = (
                re.sub(r"[^\w\s-]", "", company_name.strip()) if company_name else ""
            )
            clean_position = (
                re.sub(r"[^\w\s-]", "", position.strip()) if position else ""
            )

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

    def get_status(self) -> dict:
        """Get current pipeline status"""
        return dbOps.getPipelineStatus()


# Global pipeline processor instance
pipeline_processor = PipelineProcessor()


def start_pipeline_processor():
    """Start the pipeline processor"""
    pipeline_processor.start()


def stop_pipeline_processor():
    """Stop the pipeline processor"""
    pipeline_processor.stop()


def get_pipeline_status():
    """Get current pipeline status"""
    return pipeline_processor.get_status()


def cleanup_on_startup():
    """Clean up processing sessions on startup"""
    return dbOps.cleanupProcessingSessionsOnStartup()
