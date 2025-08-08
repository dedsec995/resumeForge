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
        """Update user's individual counter to a specific value"""
        try:
            userRef = self.db.collection("users").document(userId)
            userRef.update({
                "individualJobDescriptionCounter": counterValue,
                "metadata.lastUpdated": firestore.SERVER_TIMESTAMP
            })
            print(f"User {userId} individual counter updated to: {counterValue}")
            return True
        except Exception as e:
            print(f"Error updating user individual counter: {e}")
            return False


# Initialize database operations instance
dbOps = DatabaseOperations()
