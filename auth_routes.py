from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional
from firebase_config import firebaseAuth
from firebase_admin import auth
from database_operations import dbOps
from auth_middleware import verifyFirebaseToken

authRouter = APIRouter(prefix="/auth", tags=["authentication"])

# Request/Response Models
class CreateUserRequest(BaseModel):
    idToken: str
    displayName: Optional[str] = ""

class EnsureUserRequest(BaseModel):
    idToken: str

class TokenVerifyRequest(BaseModel):
    idToken: str

class ProfileUpdateRequest(BaseModel):
    profile: Dict[str, Any]

class AuthResponse(BaseModel):
    message: str
    userId: Optional[str] = None
    email: Optional[str] = None
    userData: Optional[Dict[str, Any]] = None

@authRouter.post("/create-user", response_model=AuthResponse)
async def createUser(request: CreateUserRequest):
    """Create user document in Firestore (called after frontend Firebase Auth signup)"""
    try:
        # Verify token to get user info
        decodedToken = auth.verify_id_token(request.idToken)
        userId = decodedToken['uid']
        email = decodedToken.get('email', '')
        
        print(f"Creating Firestore document for authenticated user: {userId}")
        
        # Create user document in Firestore
        success = dbOps.createUser(userId, email, request.displayName)
        
        if success:
            print(f"Firestore user document created successfully for: {userId}")
            return AuthResponse(
                message="User profile created successfully",
                userId=userId,
                email=email
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create user profile")
            
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Create user error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@authRouter.post("/ensure-user", response_model=AuthResponse)
async def ensureUser(request: EnsureUserRequest):
    """Ensure user document exists (called after frontend Firebase Auth login)"""
    try:
        # Verify token to get user info
        decodedToken = auth.verify_id_token(request.idToken)
        userId = decodedToken['uid']
        email = decodedToken.get('email', '')
        displayName = decodedToken.get('name', email.split('@')[0])
        
        print(f"Ensuring user document exists for: {userId}")
        
        # Check if user document exists
        userData = dbOps.getUser(userId)
        
        if not userData:
            print(f"User document not found, creating for existing Firebase Auth user: {userId}")
            # Create user document for existing Firebase Auth user
            success = dbOps.createUser(userId, email, displayName)
            if success:
                userData = dbOps.getUser(userId)
                print(f"Created Firestore document for existing Auth user: {userId}")
            else:
                raise HTTPException(status_code=500, detail="Failed to create user profile")
        else:
            print(f"User document found, updating last login: {userId}")
            # Update last login time
            dbOps.updateLastLogin(userId)
        
        return AuthResponse(
            message="User verified successfully",
            userId=userId,
            email=email,
            userData=userData
        )
        
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Ensure user error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"User verification failed: {str(e)}")

@authRouter.post("/logout")
async def logout(userId: str = Depends(verifyFirebaseToken)):
    """Handle logout (revoke refresh tokens)"""
    try:
        # Revoke all refresh tokens for user
        auth.revoke_refresh_tokens(userId)
        
        return {"message": "Logout successful"}
        
    except Exception as e:
        print(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")

@authRouter.post("/verify-token")
async def verifyToken(request: TokenVerifyRequest):
    """Verify if token is valid"""
    try:
        # Verify token
        decodedToken = auth.verify_id_token(request.idToken)
        userId = decodedToken['uid']
        email = decodedToken.get('email', '')
        
        return {
            "valid": True,
            "userId": userId,
            "email": email
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": "Invalid token"
        }

@authRouter.get("/profile")
async def getProfile(userId: str = Depends(verifyFirebaseToken)):
    """Get user profile"""
    try:
        userData = dbOps.getUser(userId)
        
        if not userData:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return {"profile": userData}
        
    except Exception as e:
        print(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get profile")

@authRouter.post("/profile")
async def updateProfile(request: ProfileUpdateRequest, userId: str = Depends(verifyFirebaseToken)):
    """Update user profile"""
    try:
        success = dbOps.updateUserProfile(userId, request.profile)
        
        if success:
            return {"message": "Profile updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")
            
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")