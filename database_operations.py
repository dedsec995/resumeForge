from firebase_config import db
from firebase_admin import firestore
from datetime import datetime
import uuid


class DatabaseOperations:

    def __init__(self):
        self.db = db

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
    def createSession(self, userId, jobDescription):
        """Create new resume session"""
        try:
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

            # Update user's total sessions count
            userRef = self.db.collection("users").document(userId)
            userRef.update({"totalSessions": firestore.Increment(1)})

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
                return sessionDoc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    def getAllSessions(self, userId, limit=10):
        """Get all sessions for user"""
        try:
            sessionsRef = (
                self.db.collection("users").document(userId).collection("sessions")
            )
            query = sessionsRef.order_by(
                "timestamp", direction=firestore.Query.DESCENDING
            ).limit(limit)

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


# Initialize database operations instance
dbOps = DatabaseOperations()
