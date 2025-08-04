import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import os

# Initialize Firebase Admin SDK
def initializeFirebase():
    try:
        if not firebase_admin._apps:
            print("Initializing Firebase Admin SDK...")
            # Load service account from firebase.json
            with open('firebase.json', 'r') as f:
                serviceAccountKey = json.load(f)
            
            print(f"Loading service account for project: {serviceAccountKey.get('project_id')}")
            
            cred = credentials.Certificate(serviceAccountKey)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
        else:
            print("Firebase Admin SDK already initialized")
        
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        import traceback
        traceback.print_exc()
        raise

# Get Firebase Auth instance
def getFirebaseAuth():
    return auth

# Initialize Firestore client
print("Starting Firebase initialization...")
db = initializeFirebase()
firebaseAuth = getFirebaseAuth()
print("Firebase configuration complete")