import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

def initializeFirebase():
    """Initialize Firebase Admin SDK using existing configuration"""
    try:
        if not firebase_admin._apps:
            print("🔄 Initializing Firebase Admin SDK...")
            # Load service account from firebase.json
            with open('firebase.json', 'r') as f:
                serviceAccountKey = json.load(f)
            
            print(f"📁 Loading service account for project: {serviceAccountKey.get('project_id')}")
            
            cred = credentials.Certificate(serviceAccountKey)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized successfully!")
        else:
            print("✅ Firebase Admin SDK already initialized")
        
        return True
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        import traceback
        traceback.print_exc()
        return False

def getUserSessions(userId):
    """Fetch all sessions for a specific user"""
    try:
        # Try to use the existing Firestore client from firebase_config
        try:
            from firebase_config import db
            print("🔗 Using existing Firestore client from firebase_config")
        except ImportError:
            print("🔄 Creating new Firestore client")
            db = firestore.client()
        
        # Reference to the user's sessions collection
        sessionsRef = db.collection('users').document(userId).collection('sessions')
        
        # Get all sessions
        sessions = sessionsRef.stream()
        
        sessionsData = []
        for session in sessions:
            sessionData = session.to_dict()
            sessionsData.append(sessionData)
        
        print(f"✅ Found {len(sessionsData)} sessions for user {userId}")
        return sessionsData
        
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        import traceback
        traceback.print_exc()
        return []

def displaySessions(sessions):
    """Display sessions with Company Name and Location only"""
    if not sessions:
        print("❌ No sessions found!")
        return
    
    print(f"\n📋 Sessions Summary:")
    print("=" * 50)
    
    for i, session in enumerate(sessions, 1):
        companyName = session.get('companyName', 'N/A')
        location = session.get('location', 'N/A')
        print(f"{i}. {companyName} - {location}")



def main():
    """Main function to fetch and display user sessions"""
    print("🔥 Firebase User Sessions Test")
    print("=" * 50)
    
    # User ID to test
    userId = "7eEjMDq4csOTVeqhOBhyHs0FxtJ2"
    print(f"👤 Testing with User ID: {userId}")
    
    # Initialize Firebase
    if not initializeFirebase():
        return
    
    # Fetch user sessions
    sessions = getUserSessions(userId)
    if not sessions:
        print("❌ No sessions found for this user")
        return
    
    # Display sessions
    displaySessions(sessions)
    
    print("\n🎉 Process completed successfully!")

if __name__ == "__main__":
    main()
