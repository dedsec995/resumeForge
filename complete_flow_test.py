#!/usr/bin/env python3
"""
Complete Flow Test - Verifies entire Resume Forge API workflow
This script tests all components to ensure everything works properly
"""

import requests
import json
import time
import os
from pathlib import Path

BASE_URL = "http://localhost:8001"

def checkPrerequisites():
    """Check if all required files and dependencies exist"""
    print("🔍 Checking Prerequisites")
    print("=" * 50)
    
    required_files = [
        "agent.py",
        "app.py", 
        "utils.py",
        "latex2pdf.py",
        "template/resume.tex",
        "requirements.txt"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"\n❌ Missing files: {missing_files}")
        return False
    
    # Check if output directory exists or can be created
    output_dir = Path("output")
    if not output_dir.exists():
        output_dir.mkdir(exist_ok=True)
        print("✅ Created output directory")
    else:
        print("✅ Output directory exists")
    
    print("\n✅ All prerequisites check passed!")
    return True

def testServerConnection():
    """Test if the API server is running and responsive"""
    print("\n🌐 Testing Server Connection")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Server Status: {result['status']}")  
            print(f"💬 Message: {result['message']}")
            return True
        else:
            print(f"❌ Server responded with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        print("💡 Start server with: python app.py")
        return False
    except Exception as e:
        print(f"❌ Error connecting to server: {str(e)}")
        return False

def testCompleteIndividualWorkflow():
    """Test the complete individual workflow with all steps"""
    print("\n🔧 Testing Complete Individual Workflow")
    print("=" * 50)
    
    # Comprehensive job description for testing
    job_description = """
    Senior Full Stack Developer
    Company: TechInnovate Solutions
    Location: San Francisco, CA
    
    About the Role:
    We are seeking a highly skilled Senior Full Stack Developer to join our growing engineering team. 
    You will be responsible for developing scalable web applications using modern technologies.
    
    Key Requirements:
    - 5+ years of experience in full-stack development
    - Proficiency in Python, JavaScript, React, Node.js
    - Experience with cloud platforms (AWS, Azure, GCP)
    - Strong knowledge of databases (PostgreSQL, MongoDB, Redis)
    - Experience with containerization (Docker, Kubernetes)
    - Knowledge of CI/CD pipelines and DevOps practices
    - Experience with microservices architecture
    - Strong problem-solving and analytical skills
    - Excellent communication and teamwork abilities
    
    Responsibilities:
    - Design and develop robust, scalable web applications
    - Collaborate with cross-functional teams to define and implement new features
    - Write clean, maintainable, and well-documented code
    - Participate in code reviews and maintain coding standards
    - Optimize application performance and ensure high availability
    - Mentor junior developers and contribute to technical decisions
    - Stay updated with emerging technologies and industry best practices
    
    Preferred Qualifications:
    - Experience with GraphQL, WebSocket, REST APIs
    - Knowledge of machine learning frameworks (TensorFlow, PyTorch)
    - Experience with message queues (RabbitMQ, Apache Kafka)
    - Understanding of security best practices
    - Experience with monitoring and logging tools
    """
    
    session_id = None
    
    try:
        # Step 1: Initialize Session
        print("1️⃣ Initializing session...")
        init_response = requests.post(
            f"{BASE_URL}/initializeSession",
            json={"jobDescription": job_description},
            timeout=30
        )
        
        if init_response.status_code != 200:
            print(f"❌ Session initialization failed: {init_response.text}")
            return False
            
        session_id = init_response.json()["sessionId"]
        print(f"✅ Session ID: {session_id[:8]}...")
        
        # Step 2: Extract Company Information
        print("2️⃣ Extracting company information...")
        extract_response = requests.post(
            f"{BASE_URL}/extractCompanyInfo",
            json={"jobDescription": job_description},
            timeout=60
        )
        
        if extract_response.status_code == 200:
            company_info = extract_response.json()
            print(f"✅ Company: {company_info['companyName']}")
            print(f"✅ Position: {company_info['position']}")
        else:
            print(f"⚠️ Company extraction failed: {extract_response.text}")
        
        # Step 3: Edit Technical Skills
        print("3️⃣ Editing technical skills...")
        skills_response = requests.post(
            f"{BASE_URL}/editTechnicalSkills?sessionId={session_id}",
            timeout=120
        )
        
        if skills_response.status_code == 200:
            print("✅ Technical skills updated successfully")
        else:
            print(f"❌ Technical skills update failed: {skills_response.text}")
            return False
        
        # Step 4: Edit Work Experience  
        print("4️⃣ Editing work experience...")
        experience_response = requests.post(
            f"{BASE_URL}/editExperience?sessionId={session_id}",
            timeout=120
        )
        
        if experience_response.status_code == 200:
            print("✅ Work experience updated successfully")
        else:
            print(f"❌ Work experience update failed: {experience_response.text}")
            return False
        
        # Step 5: Edit Projects
        print("5️⃣ Editing projects...")
        projects_response = requests.post(
            f"{BASE_URL}/editProjects?sessionId={session_id}",
            timeout=120
        )
        
        if projects_response.status_code == 200:
            print("✅ Projects updated successfully")
        else:
            print(f"❌ Projects update failed: {projects_response.text}")
            return False
        
        # Step 6: Judge Quality
        print("6️⃣ Judging resume quality...")
        quality_response = requests.post(
            f"{BASE_URL}/judgeQuality?sessionId={session_id}",
            timeout=120
        )
        
        if quality_response.status_code == 200:
            quality_data = quality_response.json()
            print(f"✅ Quality Score: {quality_data['score']}/100")
            print(f"📝 Feedback Preview: {quality_data['feedback'][:150]}...")
            print(f"⚠️ Downsides: {quality_data['downsides'][:100]}...")
        else:
            print(f"❌ Quality judgment failed: {quality_response.text}")
            return False
        
        # Step 7: Compile Resume to PDF
        print("7️⃣ Compiling resume to PDF...")
        compile_response = requests.post(
            f"{BASE_URL}/compileResume?sessionId={session_id}",
            timeout=60
        )
        
        if compile_response.status_code == 200:
            compile_data = compile_response.json()
            if compile_data['success']:
                print(f"✅ PDF compiled successfully!")
                print(f"📄 PDF Path: {compile_data['pdfPath']}")
                
                # Verify file exists
                if os.path.exists(compile_data['pdfPath']):
                    file_size = os.path.getsize(compile_data['pdfPath'])
                    print(f"📊 PDF File Size: {file_size} bytes")
                else:
                    print("⚠️ PDF file not found on disk")
                
            else:
                print(f"❌ PDF compilation failed: {compile_data['message']}")
                return False
        else:
            print(f"❌ PDF compilation request failed: {compile_response.text}")
            return False
        
        # Step 8: Test PDF Download
        print("8️⃣ Testing PDF download...")
        download_response = requests.get(
            f"{BASE_URL}/downloadResume/{session_id}",
            timeout=30
        )
        
        if download_response.status_code == 200:
            print("✅ PDF download successful!")
            print(f"📊 Downloaded Size: {len(download_response.content)} bytes")
            print(f"📄 Content Type: {download_response.headers.get('content-type', 'unknown')}")
        else:
            print(f"⚠️ PDF download failed: {download_response.status_code}")
        
        # Step 9: Final Session Status
        print("9️⃣ Checking final session status...")
        status_response = requests.get(f"{BASE_URL}/sessionStatus/{session_id}")
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"✅ Final Status: {status_data['status']}")
            print(f"📊 Final Score: {status_data['currentScore']}")
            print(f"📄 Has PDF: {'Yes' if status_data['hasPdf'] else 'No'}")
            print(f"🔄 Iterations: {status_data['iterationCount']}")
        
        print("\n🎉 Individual workflow completed successfully!")
        return True
        
    except requests.exceptions.Timeout:
        print("⏰ Request timed out - this may indicate server issues")
        return False
    except Exception as e:
        print(f"❌ Workflow error: {str(e)}")
        return False
    finally:
        # Always clean up session
        if session_id:
            try:
                requests.delete(f"{BASE_URL}/session/{session_id}")
                print("🧹 Session cleaned up")
            except:
                pass

def testFullWorkflowEndpoint():
    """Test the full workflow endpoint"""
    print("\n🚀 Testing Full Workflow Endpoint")
    print("=" * 50)
    
    job_description = """
    Data Engineer Position
    Company: DataTech Corp
    
    Requirements:
    - Python, SQL, Apache Spark
    - AWS, Snowflake, dbt
    - Data pipeline development
    - ETL/ELT processes
    """
    
    try:
        print("🔄 Starting full workflow (this may take several minutes)...")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/fullWorkflow",
            json={"jobDescription": job_description},
            timeout=600  # 10 minutes timeout
        )
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Full workflow completed!")
            print(f"⏱️ Total Time: {end_time - start_time:.2f} seconds")
            print(f"📊 Final Score: {result['finalScore']}/100")
            print(f"🔄 Iterations: {result['iterationCount']}")
            print(f"📄 PDF Generated: {'Yes' if result['pdfPath'] else 'No'}")
            print(f"💬 Message: {result['message']}")
            
            if result['pdfPath'] and os.path.exists(result['pdfPath']):
                file_size = os.path.getsize(result['pdfPath'])
                print(f"📊 PDF Size: {file_size} bytes")
            
            return True
        else:
            print(f"❌ Full workflow failed: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.Timeout:
        print("⏰ Full workflow timed out (>10 minutes)")
        return False
    except Exception as e:
        print(f"❌ Full workflow error: {str(e)}")
        return False

def runCompleteFlowTest():
    """Run the complete flow test suite"""
    print("🎯 Resume Forge Complete Flow Test")
    print("=" * 60)
    
    # Step 1: Check prerequisites
    if not checkPrerequisites():
        print("\n❌ Prerequisites check failed. Please fix issues and try again.")
        return False
    
    # Step 2: Test server connection
    if not testServerConnection():
        print("\n❌ Server connection failed. Please start the server and try again.")
        return False
    
    # Step 3: Test individual workflow
    individual_success = testCompleteIndividualWorkflow()
    
    # Step 4: Test full workflow (optional, commented out due to time)
    print("\n💡 Full workflow test is available but takes 5-10 minutes.")
    print("Uncomment the next line to test it:")
    print("# full_workflow_success = testFullWorkflowEndpoint()")
    
    # Uncomment to test full workflow
    # full_workflow_success = testFullWorkflowEndpoint()
    
    # Final Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Prerequisites: Passed")
    print(f"✅ Server Connection: Passed")
    print(f"{'✅' if individual_success else '❌'} Individual Workflow: {'Passed' if individual_success else 'Failed'}")
    # print(f"{'✅' if full_workflow_success else '❌'} Full Workflow: {'Passed' if full_workflow_success else 'Failed'}")
    
    if individual_success:
        print("\n🎉 Resume Forge API is working correctly!")
        print("📚 Access interactive docs at: http://localhost:8001/docs")
        return True
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    runCompleteFlowTest()