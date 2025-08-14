from firebase_config import db
from firebase_admin import firestore
from datetime import datetime
import uuid


class DatabaseOperations:

    def __init__(self):
        self.db = db

    # Global Counter Operations
    def getGlobalCounter(self):
        """Get the global job description counter"""
        try:
            counterRef = self.db.collection("system").document("globalCounter")
            counterDoc = counterRef.get()
            
            if counterDoc.exists:
                return counterDoc.to_dict().get("totalJobDescriptions", 0)
            else:
                # Initialize counter if it doesn't exist
                counterRef.set({"totalJobDescriptions": 0})
                return 0
        except Exception as e:
            print(f"Error getting global counter: {e}")
            return 0

    def incrementGlobalCounter(self):
        """Increment the global job description counter"""
        try:
            counterRef = self.db.collection("system").document("globalCounter")
            counterRef.set({
                "totalJobDescriptions": firestore.Increment(1),
                "lastUpdated": firestore.SERVER_TIMESTAMP
            }, merge=True)
            print("Global counter incremented")
            return True
        except Exception as e:
            print(f"Error incrementing global counter: {e}")
            return False

    # Session Pipeline Operations


    def addToPipeline(self, userId: str, sessionId: str, jobDescription: str, selectedProvider: str = "openai"):
        """Add a session to the processing pipeline"""
        try:
            pipelineRef = self.db.collection("sessionPipeline").document(sessionId)
            pipelineData = {
                "sessionId": sessionId,
                "userId": userId,
                "jobDescription": jobDescription,
                "selectedProvider": selectedProvider,
                "status": "queued",
                "addedAt": firestore.SERVER_TIMESTAMP,
                "startedAt": None,
                "completedAt": None,
                "priority": 0,  # Default priority (FIFO)
                "retryCount": 0,
                "maxRetries": 3
            }
            pipelineRef.set(pipelineData)
            print(f"Session {sessionId} added to pipeline with selectedProvider: {selectedProvider}")
            return True
        except Exception as e:
            print(f"Error adding session to pipeline: {e}")
            return False

    def getNextSessionFromPipeline(self):
        """Get the next session from the pipeline (FIFO order)"""
        try:
            pipelineRef = self.db.collection("sessionPipeline")
            query = pipelineRef.where("status", "==", "queued")
            
            # Get all queued sessions and sort by addedAt timestamp
            docs = list(query.stream())
            if not docs:
                return None
            
            # Sort by addedAt timestamp (FIFO)
            docs.sort(key=lambda doc: doc.get("addedAt") or doc.get("__name__", ""))
            
            # Return the oldest one
            return docs[0].to_dict()
        except Exception as e:
            print(f"Error getting next session from pipeline: {e}")
            return None

    def updatePipelineSessionStatus(self, sessionId: str, status: str, additionalData: dict = None):
        """Update the status of a session in the pipeline"""
        try:
            pipelineRef = self.db.collection("sessionPipeline").document(sessionId)
            updateData = {
                "status": status,
                "lastUpdated": firestore.SERVER_TIMESTAMP
            }
            
            if status == "processing":
                updateData["startedAt"] = firestore.SERVER_TIMESTAMP
            elif status in ["completed", "failed"]:
                updateData["completedAt"] = firestore.SERVER_TIMESTAMP
            
            if additionalData:
                updateData.update(additionalData)
            
            pipelineRef.update(updateData)
            print(f"Pipeline session {sessionId} status updated to: {status}")
            return True
        except Exception as e:
            print(f"Error updating pipeline session status: {e}")
            return False

    def removeFromPipeline(self, sessionId: str):
        """Remove a session from the pipeline"""
        try:
            pipelineRef = self.db.collection("sessionPipeline").document(sessionId)
            pipelineRef.delete()
            print(f"Session {sessionId} removed from pipeline")
            return True
        except Exception as e:
            print(f"Error removing session from pipeline: {e}")
            return False

    def getPipelineStatus(self):
        """Get current pipeline status"""
        try:
            pipelineRef = self.db.collection("sessionPipeline")
            
            # Get counts for different statuses
            queued_query = pipelineRef.where("status", "==", "queued")
            processing_query = pipelineRef.where("status", "==", "processing")
            
            queued_count = len(list(queued_query.stream()))
            processing_count = len(list(processing_query.stream()))
            
            return {
                "queued": queued_count,
                "processing": processing_count,
                "total": queued_count + processing_count
            }
        except Exception as e:
            print(f"Error getting pipeline status: {e}")
            return {"queued": 0, "processing": 0, "total": 0}

    def cleanupProcessingSessionsOnStartup(self):
        """Clean up any sessions that were processing when server restarted"""
        try:
            print("Starting cleanup of processing sessions...")
            
            # Find all sessions with "processing" status
            pipelineRef = self.db.collection("sessionPipeline")
            processing_query = pipelineRef.where("status", "==", "processing")
            
            cleanup_count = 0
            for doc in processing_query.stream():
                session_data = doc.to_dict()
                sessionId = session_data.get("sessionId")
                userId = session_data.get("userId")
                
                if sessionId and userId:
                    # Mark session as failed
                    self.updateSession(userId, sessionId, {
                        "status": "failed",
                        "error": "Session failed due to server restart",
                        "errorType": "SERVER_RESTART",
                        "failedAt": datetime.now().isoformat()
                    })
                    
                    # Remove from pipeline
                    self.removeFromPipeline(sessionId)
                    cleanup_count += 1
            
            print(f"Cleanup completed. Marked {cleanup_count} sessions as failed.")
            return cleanup_count
        except Exception as e:
            print(f"Error during startup cleanup: {e}")
            return 0

    def getActivePipelineSessions(self, userId: str = None):
        """Get all active sessions in the pipeline"""
        try:
            pipelineRef = self.db.collection("sessionPipeline")
            
            if userId:
                query = pipelineRef.where("userId", "==", userId)
            else:
                query = pipelineRef.where("status", "in", ["queued", "processing"])
            
            sessions = []
            for doc in query.stream():
                sessions.append(doc.to_dict())
            
            return sessions
        except Exception as e:
            print(f"Error getting active pipeline sessions: {e}")
            return []

    # User Operations
    def createUser(self, userId, email, displayName=None):
        """Create new user document with default structure"""
        try:
            print(f"Creating user document for: {userId}")
            userRef = self.db.collection("users").document(userId)

            userData = {
                "userId": userId,
                "email": email,
                "displayName": displayName or email.split("@")[0],
                "accountTier": "FREE",  # Default tier for all new users
                "individualJobDescriptionCounter": 0,  # Individual counter for this user
                "profile": {
                    "personalInfo": {
                        "name": "",
                        "email": email,
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
                },
                "createdAt": firestore.SERVER_TIMESTAMP,
                "lastLoginAt": firestore.SERVER_TIMESTAMP,
                "totalSessions": 0,
                "metadata": {
                    "lastUpdated": firestore.SERVER_TIMESTAMP,
                    "version": "1.0",
                    "created": firestore.SERVER_TIMESTAMP,
                },
            }

            print(f"Setting user data in Firestore...")
            userRef.set(userData)
            print(f"User created successfully: {userId}")
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            import traceback

            traceback.print_exc()
            return False

    def getUser(self, userId):
        """Get user document by ID"""
        try:
            userRef = self.db.collection("users").document(userId)
            userDoc = userRef.get()

            if userDoc.exists:
                return userDoc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    def updateUserProfile(self, userId, profileData):
        """Update user profile data"""
        try:
            userRef = self.db.collection("users").document(userId)

            # Check if document exists first
            if not userRef.get().exists:
                print(f"User document not found for profile update: {userId}")
                return False

            updateData = {
                "profile": profileData,
                "metadata.lastUpdated": firestore.SERVER_TIMESTAMP,
            }

            userRef.update(updateData)
            print(f"Profile updated for user: {userId}")
            return True
        except Exception as e:
            print(f"Error updating profile: {e}")
            import traceback

            traceback.print_exc()
            return False

    def updateLastLogin(self, userId):
        """Update user's last login timestamp"""
        try:
            userRef = self.db.collection("users").document(userId)

            # Check if document exists first
            if userRef.get().exists:
                userRef.update({"lastLoginAt": firestore.SERVER_TIMESTAMP})
                print(f"Updated last login for user: {userId}")
                return True
            else:
                print(f"User document not found for last login update: {userId}")
                return False
        except Exception as e:
            print(f"Error updating last login: {e}")
            return False

    # Session Operations
    def createSession(self, userId, jobDescription, selectedProvider="openai"):
        """Create new resume session"""
        try:
            print(f"Creating session with selectedProvider: {selectedProvider}")
            sessionId = str(uuid.uuid4())
            sessionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
            )

            sessionData = {
                "sessionId": sessionId,
                "userId": userId,
                "jobDescription": jobDescription,
                "selectedProvider": selectedProvider,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "status": "created",
                "metadata": {
                    "created": firestore.SERVER_TIMESTAMP,
                    "lastUpdated": firestore.SERVER_TIMESTAMP,
                    "wordCount": len(jobDescription.split()),
                    "characterCount": len(jobDescription),
                },
                "workflowResult": {},
                "tailoredResume": {},
                "completedAt": None,
                "score": 0,
                "companyName": "",
                "position": "",
                "location": "Open to Relocation",
                "latexFilePath": "",
                "pdfFilePath": "",
                "latexContent": "",
            }

            sessionRef.set(sessionData)
            print(f"Session {sessionId} created with selectedProvider: {selectedProvider}")

            # Update user's total sessions count
            userRef = self.db.collection("users").document(userId)
            userRef.update({"totalSessions": firestore.Increment(1)})

            # Increment global counter (this persists even when sessions are deleted)
            self.incrementGlobalCounter()

            # Increment individual counter for this user
            self.incrementIndividualCounter(userId)

            print(f"Session created: {sessionId}")
            return sessionId
        except Exception as e:
            print(f"Error creating session: {e}")
            return None

    def getSession(self, userId, sessionId):
        """Get specific session"""
        try:
            sessionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
            )
            sessionDoc = sessionRef.get()

            if sessionDoc.exists:
                session_data = sessionDoc.to_dict()
                print(f"Retrieved session {sessionId} with selectedProvider: {session_data.get('selectedProvider')}")
                return session_data
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    def getAllSessions(self, userId, limit=None):
        """Get all sessions for user"""
        try:
            sessionsRef = (
                self.db.collection("users").document(userId).collection("sessions")
            )
            query = sessionsRef.order_by(
                "timestamp", direction=firestore.Query.DESCENDING
            )
            
            if limit:
                query = query.limit(limit)

            sessions = []
            for doc in query.stream():
                sessionData = doc.to_dict()
                sessions.append(sessionData)

            return sessions
        except Exception as e:
            print(f"Error getting sessions: {e}")
            return []

    def updateSession(self, userId, sessionId, updateData):
        """Update session data"""
        try:
            sessionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
            )

            updateData["metadata.lastUpdated"] = firestore.SERVER_TIMESTAMP
            sessionRef.update(updateData)

            print(f"Session updated: {sessionId}")
            return True
        except Exception as e:
            print(f"Error updating session: {e}")
            return False

    def deleteSession(self, userId, sessionId):
        """Delete session"""
        try:
            sessionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
            )
            sessionRef.delete()

            # Update user's total sessions count
            userRef = self.db.collection("users").document(userId)
            userRef.update({"totalSessions": firestore.Increment(-1)})

            print(f"Session deleted: {sessionId}")
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False

    def updateUserAccountTier(self, userId, accountTier):
        """Update user's account tier"""
        try:
            userRef = self.db.collection("users").document(userId)
            userRef.update({
                "accountTier": accountTier,
                "metadata.lastUpdated": firestore.SERVER_TIMESTAMP
            })
            print(f"User {userId} account tier updated to: {accountTier}")
            return True
        except Exception as e:
            print(f"Error updating user account tier: {e}")
            return False

    def getUsersWithoutAccountTier(self):
        """Get all users without accountTier field"""
        try:
            users_ref = self.db.collection("users")
            users = users_ref.stream()
            
            users_without_tier = []
            for user in users:
                user_data = user.to_dict()
                if "accountTier" not in user_data:
                    users_without_tier.append({
                        "userId": user.id,
                        "email": user_data.get("email", ""),
                        "displayName": user_data.get("displayName", "")
                    })
            
            return users_without_tier
        except Exception as e:
            print(f"Error getting users without accountTier: {e}")
            return []

    def updateUserApiConfig(self, userId, apiData):
        """Update user API configuration data"""
        try:
            userRef = self.db.collection("users").document(userId)

            # Check if document exists first
            if not userRef.get().exists:
                print(f"User document not found for API config update: {userId}")
                return False

            updateData = {
                "apiData": apiData,
                "metadata.lastUpdated": firestore.SERVER_TIMESTAMP,
            }

            userRef.update(updateData)
            print(f"API config updated for user: {userId}")
            return True
        except Exception as e:
            print(f"Error updating API config: {e}")
            import traceback
            traceback.print_exc()
            return False

    def getUserApiConfig(self, userId):
        """Get user API configuration data"""
        try:
            userRef = self.db.collection("users").document(userId)
            userDoc = userRef.get()
            
            if not userDoc.exists:
                print(f"User document not found: {userId}")
                return None
            
            userData = userDoc.to_dict()
            return userData.get("apiData", {})
        except Exception as e:
            print(f"Error getting user API config: {e}")
            return None

    # Individual Counter Operations
    def getIndividualCounter(self, userId):
        """Get the individual job description counter for a user"""
        try:
            userRef = self.db.collection("users").document(userId)
            userDoc = userRef.get()
            
            if userDoc.exists:
                userData = userDoc.to_dict()
                return userData.get("individualJobDescriptionCounter", 0)
            return 0
        except Exception as e:
            print(f"Error getting individual counter for user {userId}: {e}")
            return 0

    def incrementIndividualCounter(self, userId):
        """Increment the individual job description counter for a user"""
        try:
            userRef = self.db.collection("users").document(userId)
            userRef.update({
                "individualJobDescriptionCounter": firestore.Increment(1),
                "metadata.lastUpdated": firestore.SERVER_TIMESTAMP
            })
            print(f"Individual counter incremented for user: {userId}")
            return True
        except Exception as e:
            print(f"Error incrementing individual counter for user {userId}: {e}")
            return False

    def getUsersWithoutIndividualCounter(self):
        """Get all users without individualJobDescriptionCounter field"""
        try:
            users_ref = self.db.collection("users")
            users = users_ref.stream()
            
            users_without_counter = []
            for user in users:
                user_data = user.to_dict()
                if "individualJobDescriptionCounter" not in user_data:
                    users_without_counter.append({
                        "userId": user.id,
                        "email": user_data.get("email", ""),
                        "displayName": user_data.get("displayName", "")
                    })
            
            return users_without_counter
        except Exception as e:
            print(f"Error getting users without individual counter: {e}")
            return []

    def updateUserIndividualCounter(self, userId, counterValue=0):
        """Update individual counter for a user"""
        try:
            userRef = self.db.collection("users").document(userId)
            userRef.update({
                "individualCounter": counterValue,
                "lastUpdated": firestore.SERVER_TIMESTAMP
            })
            print(f"Individual counter updated for user {userId}: {counterValue}")
            return True
        except Exception as e:
            print(f"Error updating individual counter: {e}")
            return False

    # Questions Operations
    def addQuestion(self, userId: str, sessionId: str, question: str, answer: str = None):
        """Add a question to a session's questions subcollection"""
        try:
            questionId = str(uuid.uuid4())
            questionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
                .collection("questions")
                .document(questionId)
            )

            questionData = {
                "questionId": questionId,
                "question": question,
                "answer": answer,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "answered": answer is not None
            }

            questionRef.set(questionData)
            print(f"Question added to session {sessionId}: {questionId}")
            return questionId
        except Exception as e:
            print(f"Error adding question: {e}")
            return None

    def getQuestions(self, userId: str, sessionId: str):
        """Get all questions for a session"""
        try:
            questionsRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
                .collection("questions")
            )
            
            query = questionsRef.order_by("timestamp", direction=firestore.Query.ASCENDING)
            questions = []
            
            for doc in query.stream():
                questionData = doc.to_dict()
                # Convert timestamp to string for JSON serialization
                if questionData.get("timestamp"):
                    questionData["timestamp"] = questionData["timestamp"].isoformat()
                questions.append(questionData)
            
            return questions
        except Exception as e:
            print(f"Error getting questions: {e}")
            return []

    def updateQuestionAnswer(self, userId: str, sessionId: str, questionId: str, answer: str):
        """Update the answer for a specific question"""
        try:
            questionRef = (
                self.db.collection("users")
                .document(userId)
                .collection("sessions")
                .document(sessionId)
                .collection("questions")
                .document(questionId)
            )

            questionRef.update({
                "answer": answer,
                "answered": True,
                "answeredAt": firestore.SERVER_TIMESTAMP
            })
            
            print(f"Question {questionId} answered in session {sessionId}")
            return True
        except Exception as e:
            print(f"Error updating question answer: {e}")
            return False

    def getPaginatedSessions(self, userId, page=1, pageSize=10):
        """Get paginated sessions for user"""
        try:
            sessionsRef = (
                self.db.collection("users").document(userId).collection("sessions")
            )
            
            # Calculate offset
            offset = (page - 1) * pageSize
            
            # Get total count first
            totalSessions = len(list(sessionsRef.stream()))
            
            # Get paginated results
            query = sessionsRef.order_by(
                "timestamp", direction=firestore.Query.DESCENDING
            ).offset(offset).limit(pageSize)

            sessions = []
            for doc in query.stream():
                sessionData = doc.to_dict()
                sessions.append(sessionData)

            return {
                "sessions": sessions,
                "totalSessions": totalSessions,
                "currentPage": page,
                "pageSize": pageSize,
                "totalPages": (totalSessions + pageSize - 1) // pageSize,
                "hasNextPage": (page * pageSize) < totalSessions,
                "hasPreviousPage": page > 1
            }
        except Exception as e:
            print(f"Error getting paginated sessions: {e}")
            return {
                "sessions": [],
                "totalSessions": 0,
                "currentPage": page,
                "pageSize": pageSize,
                "totalPages": 0,
                "hasNextPage": False,
                "hasPreviousPage": False
            }

    def searchSessions(self, userId: str, query: str):
        """Search sessions by company name or position"""
        try:
            sessionsRef = (
                self.db.collection("users").document(userId).collection("sessions")
            )
            
            # Get all sessions and filter by company name or position
            all_sessions = list(sessionsRef.stream())
            search_results = []
            
            query_lower = query.lower()
            
            for doc in all_sessions:
                session_data = doc.to_dict()
                company_name = session_data.get("companyName", "").lower()
                position = session_data.get("position", "").lower()
                
                # Check if query matches company name or position
                if query_lower in company_name or query_lower in position:
                    search_results.append(session_data)
            
            return search_results
        except Exception as e:
            print(f"Error searching sessions: {e}")
            return []


# Initialize database operations instance
dbOps = DatabaseOperations()
