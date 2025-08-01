#!/usr/bin/env python3
"""
Quick test script for the parseResume endpoint
Run the FastAPI server first: python app.py
Then run this script to test the new endpoint
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8002"

def testParseResumeEndpoint():
    """Test the parseResume endpoint"""
    
    print("🔍 Testing Parse Resume Endpoint")
    print("=" * 50)
    
    try:
        # Call the parseResume endpoint
        response = requests.get(f"{BASE_URL}/parseResume")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Parse Resume endpoint working!")
            print(f"📄 Success: {result['success']}")
            print(f"💬 Message: {result['message']}")
            
            resume_data = result['resumeData']
            
            # Display summary of parsed data
            print("\n📊 Parsed Resume Summary:")
            print(f"👤 Personal Info: {len(resume_data.get('personalInfo', {}))} fields")
            print(f"🛠️  Technical Skills: {'✅' if resume_data.get('technicalSkills') else '❌'}")
            print(f"💼 Work Experience: {len(resume_data.get('workExperience', []))} entries")
            print(f"🚀 Projects: {len(resume_data.get('projects', []))} entries")
            print(f"🎓 Education: {'✅' if resume_data.get('education') else '❌'}")
            print(f"📜 Certifications: {'✅' if resume_data.get('certifications') else '❌'}")
            
            # Show personal info details
            if resume_data.get('personalInfo'):
                print("\n👤 Personal Information:")
                for key, value in resume_data['personalInfo'].items():
                    print(f"   {key}: {value}")
            
            # Show work experience summary
            if resume_data.get('workExperience'):
                print(f"\n💼 Work Experience ({len(resume_data['workExperience'])} entries):")
                for i, exp in enumerate(resume_data['workExperience'], 1):
                    print(f"   {i}. {exp.get('jobTitle', 'N/A')} at {exp.get('company', 'N/A')}")
                    print(f"      Duration: {exp.get('duration', 'N/A')}")
                    print(f"      Bullet Points: {len(exp.get('bulletPoints', []))}")
            
            # Show projects summary
            if resume_data.get('projects'):
                print(f"\n🚀 Projects ({len(resume_data['projects'])} entries):")
                for i, proj in enumerate(resume_data['projects'], 1):
                    print(f"   {i}. {proj.get('projectName', 'N/A')}")
                    print(f"      Tech Stack: {proj.get('techStack', 'N/A')}")
                    print(f"      Bullet Points: {len(proj.get('bulletPoints', []))}")
            
            print(f"\n📄 Raw Content Length: {len(resume_data.get('rawContent', ''))} characters")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the FastAPI server is running")
        print("💡 Run: python app.py")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def testHealthCheck():
    """Test the health check endpoint"""
    
    print("\n❤️ Testing Health Check")
    print("=" * 30)
    
    try:
        response = requests.get(f"{BASE_URL}/")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Status: {result['status']}")
            print(f"💬 Message: {result['message']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error connecting to API: {str(e)}")
        print("💡 Make sure the server is running: python app.py")

if __name__ == "__main__":
    print("🎯 Resume Parse Endpoint Test")
    print("=" * 50)
    
    # Test health check first
    testHealthCheck()
    
    # Test the parse resume endpoint
    testParseResumeEndpoint()
    
    print("\n🎉 Testing completed!")
    print("📚 Visit http://localhost:8002/docs to see the new endpoint in the API docs")
    print("🌐 Visit http://localhost:5173 to test the frontend integration")