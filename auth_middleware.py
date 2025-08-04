from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from typing import Optional

security = HTTPBearer()

async def verifyFirebaseToken(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Dependency to verify Firebase JWT token and return userId"""
    try:
        idToken = credentials.credentials
        
        # Verify token with Firebase
        decodedToken = auth.verify_id_token(idToken)
        userId = decodedToken['uid']
        
        return userId
        
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Token revoked")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def optionalAuth(request: Request) -> Optional[str]:
    """Optional authentication dependency - returns userId if authenticated, None otherwise"""
    try:
        authHeader = request.headers.get('Authorization')
        if authHeader and authHeader.startswith('Bearer '):
            idToken = authHeader.split('Bearer ')[1]
            decodedToken = auth.verify_id_token(idToken)
            return decodedToken['uid']
        return None
    except Exception:
        return None

class AuthData:
    """Helper class to get detailed auth data"""
    def __init__(self, credentials: HTTPAuthorizationCredentials = Depends(security)):
        try:
            idToken = credentials.credentials
            self.decodedToken = auth.verify_id_token(idToken)
            self.userId = self.decodedToken['uid']
            self.email = self.decodedToken.get('email', '')
        except Exception as e:
            raise HTTPException(status_code=401, detail="Authentication failed")