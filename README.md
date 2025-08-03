# ResumeForge AI Agent

This project is an AI agent that tailors a LaTeX resume to a specific job description using Langgraph and Groq.

## Setup

1.  **Install LaTeX:** You need to have a LaTeX distribution installed on your system. You can use a tool like TeX Live, MiKTeX, or MacTeX.
2.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Set up Groq API Key:**
    Create a `.env` file in the root of the project and add your Groq API key:
    ```
    GROQ_API_KEY=your_api_key_here
    ```

## Usage

```bash
python main.py --resume path/to/your/resume.tex --job-description "Your job description here"
```

### DELETE LATER



sample_json_data = """{
      "sessionId": "d82b7e61-0cc2-489f-842d-eba9a0f6df71",
      "jobDescription": "Machine Learning Engineer (Hybrid)\\nat Weedmaps (View all jobs)\\nAustin, TX\\nMachine Learning Engineer (Hybrid - Onsite 2 days a week)\\n\\nOverview:\\n\\nThe Machine Learning Engineer at Weedmaps will be a key technical contributor within our Data organization. In this role you will build and deploy sophisticated AI and machine learning systems that power our marketplace and e-commerce platform. The ideal candidate is a hands-on ML practitioner with strong software engineering fundamentals who can build end-to-end systems that deliver measurable business impact. You will collaborate extensively with cross-functional teams, including Product to understand user needs and translate them into ML solutions; Engineering to integrate ML systems into our broader ecosystem; Data and Analytics to leverage insights and coordinate on data strategies; as well as stakeholders across the business to ensure ML initiatives are aligned with company objectives.\\n\\nAs part of our Data organization, you will develop and deploy machine learning solutions that address unique challenges in our marketplace, including product matching, personalized recommendations that comply with complex regulatory requirements, and data-driven optimizations across our marketplace. The explosive growth of the cannabis industry requires increasingly sophisticated ML solutions that can scale with our business.\\n\\nThe impact you'll make:\\n\\nDevelop production-ready Python-based ML models with a focus on advanced NLP, similarity metrics, and product matching and recommendations\\nCreate and refine machine learning pipelines that can handle the unique challenges of our product data, including inconsistent naming and categorization\\nDevelop comprehensive evaluation frameworks including evals and metrics to benchmark ML model performance in real-world scenarios\\nImplement automated evaluation pipelines to continuously monitor model performance in production\\nBuild and maintain scalable ML infrastructure using a mix of managed services (eg AWS SageMaker) and custom services (such as function as a service apps on Kubernetes)\\nImplement best practices for model serving, versioning, and monitoring in production environments\\nOptimize model deployment pipelines for reliability, performance, and cost-efficiency\\nDesign, implement, and analyze A/B (or MAB) tests to evaluate ML system performance in production systems (e.g. with Optimizely or similar tools), ensuring that ML systems achieve business objectives\\nDesign and build API-based microservices that integrate ML functionality into our broader engineering ecosystem, ideally creating reusable ML components that can be leveraged across multiple product lines\\nWhat you've accomplished:\\n\\nBachelor's degree in Computer Science, Data Science, or related quantitative field\\n2+ years of experience building and deploying machine learning models in production environments\\n4+ Years of relevant experience in Machine Learning, Data Science, Data/Software Engineering.\\nStrong programming skills in Python and experience with modern LLM endpoints\\nExperience with MLOps practices for model monitoring, maintenance, and lifecycle management\\nDemonstrated expertise in machine learning algorithms and frameworks (e.g. TensorFlow, PyTorch, or scikit-learn) as well as modern LLM systems (Anthropic, OpenAI) with a proven track record of deploying models to production\\nProficiency in software engineering best practices, including version control, code review, testing, and documentation\\nStrong understanding of data engineering principles and experience with data preprocessing, feature engineering, and data quality assurance\\nHistory of effective collaboration with cross-functional teams to deliver ML solutions that drive measurable business results\\nExperience communicating complex ML concepts to both technical and non-technical stakeholders\\nExperience with cloud computing platforms, preferably AWS (particularly SageMaker and Bedrock)\\nBonus points:\\n\\nExperience using AI endpoints such as Claude or ChatGPT for embeddings and more advanced AI pipeline use cases such as hybrid ranking systems leveraging RAG with AI-based re-rankers that optimize specific metrics (e.g. precision)\\nSuccessfully built and deployed ML systems that solved real business problems in e-commerce or marketplace environments\\nE-commerce or marketplace business experience preferred\\nRegulated industry experience - nice to have\\nThe base pay range for this position is $181,875.00 - $200,645.00 per year\\n\\n2025 Benefits for Full Time, Regular Employees:\\n\\nPhysical Health benefits: Medical, Dental & Vision:\\nEmployee - employer paid premium 100%\\nCompany contribution to a HSA when electing the High Deductible Health Plan\\nFor plans that offer coverage to your dependents, you pay a small contribution\\nMental Health benefits:\\nFree access to CALM app for employees and dependents\\nEmployee Training\\nMental Health seminars and Q&A sessions\\nBasic Life & AD&D - employer paid 1x salary up to $250,000\\n401(k) Retirement Plan (with employer match contribution)\\nGenerous PTO, Paid Sick Leave, and Company Holidays\\nSupplemental, voluntary benefits\\nStudent Loan Repayment/529 Education Savings - including a company contribution\\nFSA (Medical, Dependent, Transit and Parking)\\nVoluntary Life and AD&D Insurance\\nCritical Illness Insurance\\nAccident Insurance\\nShort- and Long-term Disability Insurance\\nPet Insurance\\nFamily planning/fertility\\nIdentity theft protection\\nLegal access to a network of attorneys\\nPaid parental leave\\nWhy Work at Weedmaps?\\n\\nYou get to work at the leading technology company in the cannabis industry\\nYou get to play a meaningful role in helping to advance cannabis causes, including helping improve the lives of patients who rely on the benefits of cannabis\\nYou get an opportunity to shape the future of the cannabis industry\\nYou get to work on challenging issues in a collaborative environment that encourages you to do your best \\nYou get to work in a casual and fun environment; no fancy clothes required, but you are free to dress to the nines!\\nGenerous PTO and company holidays\\nNumerous opportunities and tools to learn and grow your professional skills\\nEndless opportunities to network and connect with other Weedmappers through speaker series, Employee Resource Groups, happy hours, team celebrations, game nights, and much more!,
      "linkedin": "linkedin.com/in/amit-luhar/",
      "github": "github.com/dedsec995",
      "website": "https://amitluhar.com/"
        },
        "certifications": [
          {
            "text": "Natural Language Processing - DeepLearning.AI",
            "url": "https://www.coursera.org/account/accomplishments/certificate/PXWY38Y7VJZB"
          },
          {
            "text": "TensorFlow Developer Specialization",
            "url": "https://www.coursera.org/account/accomplishments/specialization/certificate/YW8U4922JT6N"
          }
        ],
        "technicalSkillsCategories": [
          {
            "categoryName": "Languages",
            "skills": "Python, C++, SQL, Bash, JavaScript/TypeScript"
          },
          {
            "categoryName": "ML / AI",
            "skills": "PyTorch, TensorFlow, Keras, Langchain, Transformers, Scikit-learn, Pandas, NumPy, OpenCV"
          },
          {
            "categoryName": "Backend & Cloud",
            "skills": "Flask, Node, FastApi, Django, REST APIs, Docker, Kubernetes, MLFlow, AWS, Git"
          },
          {
            "categoryName": "Data & Pipelines",
            "skills": "PySpark, Apache Airflow, Dask, Kafka, JSON, CSV"
          }
        ],
        "workExperience": [
          {
            "jobTitle": "Machine Learning Assistant",
            "company": "Binghamton University",
            "location": "Binghamton, NY",
            "duration": "January 2025 -- Present",
            "bulletPoints": "Architected 'Data Insight', a **multi-agent AI platform** that accelerates the product development lifecycle by automating **EDA** and feature engineering. System achieved over **90% accuracy** in feature identification, enabling data scientists to rapidly uncover data\\nCollaborated in a team of six researchers to architect an automated **AutoML pipeline**, orchestrated agentic workflows for training diverse ML models and leveraged **MLflow** for experiment tracking, resulting 70% reduction in end-to-end analysis"
          },
          {
            "jobTitle": "SafeRide Engineer",
            "company": "Binghamton University",
            "location": "Binghamton, NY",
            "duration": "August 2024 -- December 2024",
            "bulletPoints": "Developed and deployed a scalable, **LLM-powered chatbot** using Python and **Langchain**, integrating with a existing platform to automate user inquiries\\nConstructed Python scripts and tooling to execute **dynamic SQL queries** against database, significantly improving the data processing efficiency of the AI agent and removing human interaction\\nImplemented comprehensive **LLM observability using Langfuse** for detailed tracing and cost monitoring, ensuring the reliability and quality of the production service"
          },
          {
            "jobTitle": "Artificial Intelligence Engineer",
            "company": "Flow.ai",
            "location": "Austin, Texas",
            "duration": "January 2024 -- May 2024",
            "bulletPoints": "Architected end-to-end NLP solutions for Django SaaS platform utilizing **Transformer**, **Bedrock**, **SageMaker**, and **ECS**\\nIncreased **Mixtral 8x7B** accuracy in sales-related query processing by **31%** through **document chunk mechanisms** within **RAG**\\nReduced **LLM inference latency** to an average of **2.78s** using **vLLM** and **PagedAttention** for optimized **KV cache** handling\\nImproved **response times** by **40%** through **Redis caching** of frequent queries, reducing redundant **LLM calls**"
          },
          {
            "jobTitle": "Software Engineer",
            "company": "Tata Elxsi",
            "location": "Pune, India",
            "duration": "August 2021 -- June 2022",
            "bulletPoints": "Enhanced a **large-scale data processing system** by optimizing a **C++ framework** for **real-time telemetry**, reducing data transmission latency by **21%** (**55.3 ms**) to improve downstream data availability for **millions of vehicles**\\nDeveloped a **data pipeline** managing diverse CAN protocols, implementing **thread-safe concurrent data transfer** of **3 million vehicles** data via **Spark**, pipelined through **Kafka**, and scaled with **Kubernetes** to process **100,000+ events/second**\\nUtilized **Apache Airflow** to monitor **data pipeline performance**, troubleshoot issues, and ensure **data quality** and **reliability**\\nPartnered with the testing team to design a **car emulator**, obviating **testing costs** by eliminating the necessity of physical vehicles for testing"
          },
          {
            "jobTitle": "Software Engineer",
            "company": "Shree Hari Enterprise",
            "location": "Mumbai, India",
            "duration": "January 2020  -- June 2021",
            "bulletPoints": "Designed and deployed a **dynamic route optimization engine** (**VRP-based**) utilizing **real-time Mumbai traffic data**, reduced **vehicle idle time by 40 minutes per day** and optimized delivery sequences for **400+ daily orders**\\nDeveloped a **hyper-local demand forecasting model** using **XGBoost** for **FMCG products**, leveraging **Tally ERP data** and improving **forecast accuracy by 13%** and **preventing stockouts**\\nImplemented an **MLOps pipeline** using **MLFlow** for **continuous integration and deployment** of the forecasting model, automating model retraining cycles and **reducing deployment time by 50%**\\nCollaborated with stakeholders to decrease excess inventory holding **costs by 7%** while maintaining a **99% service level**"
          }
        ],
        "projects": [
          {
            "projectName": "Foodie",
            "techStack": "Python, LangGraph, OpenAI",
            "projectLink": "https://github.com/dedsec995/Foodiee/",
            "linkText": "Source Code",
            "bulletPoints": "Orchestrated an **agentic workflow using LangGraph** to build an intelligent cooking assistant that automates recipe discovery, scales ingredients for different serving sizes, and manages user inventory"
          },
          {
            "projectName": "Navi Drive",
            "techStack": "C++, Tensorflow, Android",
            "projectLink": "http://ijrar.org/viewfull.php?&p_id=IJRAR21B1839",
            "linkText": "Paper",
            "bulletPoints": "Crafted a real-time solution, fine-tuning **SSD mobilenet v2 keras** for vehicles, traffic signs, traffic lights for object detection\\nOptimized and deployed tensorflow lite on edge device, reducing inference to **100ms & 38 mAP** accuracy by **8 bit quantization**"
          }
        ],
        "education": [
          {
            "university": "State University of New York at Binghamton",
            "degree": "Master of Science in Computer Science",
            "date": "December 2024",
            "track": "Artificial Intelligence Trakc",
            "coursework": "Operating Systems, Machine Learning, Computer Architecture, Algorithms and Data Structures"
          }
        ],
        "atsKeywords": "",
        "metadata": {
          "lastUpdated": "2025-08-02T19:59:10.839836",
          "version": "1.0",
          "created": ""
        },
        "technicalSkills": {},
        "invisibleKeywords": "AWS, EC2, AMAZON WEB SERVICE, production systems, Implement best practices, Kubernetes, NLP, machine learning algorithms, engineering principles"
      }
    }
    """