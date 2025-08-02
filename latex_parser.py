import re

def extractBalancedBraces(text, startPos):
    if startPos >= len(text) or text[startPos] != '{':
        return None, startPos
    
    braceCount = 0
    start = startPos
    
    for i in range(startPos, len(text)):
        if text[i] == '{':
            braceCount += 1
        elif text[i] == '}':
            braceCount -= 1
            if braceCount == 0:
                return text[start+1:i], i+1
    
    return None, startPos

def extractResumeItems(content):
    items = []
    pos = 0
    
    while True:
        match = re.search(r'\\resumeItem\{', content[pos:])
        if not match:
            break
        
        startPos = pos + match.start() + len('\\resumeItem{') - 1
        itemContent, endPos = extractBalancedBraces(content, startPos)
        
        if itemContent:
            cleanContent = re.sub(r'\\textbf\{([^}]*)\}', r'**\1**', itemContent)
            cleanContent = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', cleanContent)
            cleanContent = re.sub(r'\\%', '%', cleanContent)
            cleanContent = re.sub(r'\\&', '&', cleanContent)
            cleanContent = re.sub(r'\\\\', ' ', cleanContent)
            cleanContent = re.sub(r'\\\$', '$', cleanContent)
            cleanContent = re.sub(r'\\([#&%$_{}])', r'\1', cleanContent)
            cleanContent = re.sub(r'\s+', ' ', cleanContent)
            
            items.append(cleanContent.strip())
        
        pos = endPos if endPos > pos else pos + 1
    
    return items

def parseWorkExperience(content):
    experiences = []
    # Updated pattern to handle BeginAccSupp formatting in job titles
    pattern = r'\\workExSubheading\{([^}]+)\}\{([^{}]*(?:\\BeginAccSupp\{[^}]*\}[^{}]*\\EndAccSupp\{\}|[^{}])*)\}\{([^}]+)\}\{([^}]+)\}'
    matches = re.finditer(pattern, content)
    
    for match in matches:
        company, jobTitle, location, duration = match.groups()
        
        # Clean BeginAccSupp formatting from job title
        jobTitle = re.sub(r'\\BeginAccSupp\{[^}]*\}(.*?)\\EndAccSupp\{\}', r'\1', jobTitle)
        
        startPos = match.end()
        nextMatch = re.search(r'\\workExSubheading', content[startPos:])
        endPos = startPos + nextMatch.start() if nextMatch else len(content)
        
        sectionContent = content[startPos:endPos]
        bulletPoints = extractResumeItems(sectionContent)
        
        experiences.append({
            "jobTitle": jobTitle.strip(),
            "company": company.strip(),
            "location": location.strip(), 
            "duration": duration.strip(),
            "bulletPoints": bulletPoints
        })
    
    return experiences

def parseProjects(content):
    projects = []
    # Updated pattern to handle BeginAccSupp formatting in tech stack
    pattern = r'\\resumeProjectHeading\{.*\}\{([^{}]*(?:\\BeginAccSupp\{[^}]*\}[^{}]*\\EndAccSupp\{\}|[^{}])*)\}(?:\s*\\\\)'
    matches = list(re.finditer(pattern, content))
    
    for i, match in enumerate(matches):
        techStack = match.group(1)
        # Clean BeginAccSupp formatting from tech stack
        techStack = re.sub(r'\\BeginAccSupp\{[^}]*\}(.*?)\\EndAccSupp\{\}', r'\1', techStack)
        
        headingStart = match.start()
        headingEnd = match.end()
        fullHeading = content[headingStart:headingEnd]
        
        # Extract project name
        namePattern = r'\\textbf\{\{([^}]+)\}\}'
        nameMatch = re.search(namePattern, fullHeading)
        if nameMatch:
            projectName = nameMatch.group(1)
        else:
            fallbackPattern = r'\\resumeProjectHeading\{([^{}]*)\}'
            fallbackMatch = re.search(fallbackPattern, fullHeading)
            projectName = fallbackMatch.group(1) if fallbackMatch else "Unknown Project"
        
        # Extract project link and link text
        linkPattern = r'\\href\{([^}]*)\}\{([^}]*)\}'
        linkMatch = re.search(linkPattern, fullHeading)
        projectLink = linkMatch.group(1) if linkMatch else "#"
        linkText = linkMatch.group(2) if linkMatch else "Link"
        
        contentStart = headingEnd
        if i + 1 < len(matches):
            contentEnd = matches[i + 1].start()
        else:
            contentEnd = len(content)
        
        sectionContent = content[contentStart:contentEnd]
        bulletPoints = extractResumeItems(sectionContent)
        
        cleanTechStack = re.sub(r'\s*\$\|\$\s*', ' | ', techStack.strip())
        cleanTechStack = re.sub(r'\s*\|\s*', ' | ', cleanTechStack)
        
        projects.append({
            "projectName": projectName.strip(),
            "techStack": cleanTechStack,
            "projectLink": projectLink.strip(),
            "linkText": linkText.strip(),
            "duration": "",
            "bulletPoints": bulletPoints
        })
    
    return projects

def parseCertifications(content):
    """Parse certifications from technical skills section to extract URLs and text from href links"""
    certifications = []
    
    # Look for certifications in technical skills section - use robust pattern that captures full content
    cert_match = re.search(r'\\textbf\{Certifications\}\{:(.*?)(?:\\\\ \[1mm\]|\\\\\[1mm\])', content, re.DOTALL)
    
    if not cert_match:
        return certifications
    
    cert_content = cert_match.group(1).strip()
    
    # Simple approach: split by commas first, then process each part
    # The structure is: \href{url1}{text1} - suffix1, \href{url2}{text2} - suffix2
    parts = cert_content.split(',')
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        # Look for href pattern in this part
        href_match = re.search(r'\\href\{([^}]+)\}\{([^}]+)\}(.*)', part)
        
        if href_match:
            url = href_match.group(1).strip()
            base_text = href_match.group(2).strip()
            suffix = href_match.group(3).strip()
            
            # Clean the suffix (remove LaTeX commands and extra characters like } )
            suffix = re.sub(r'\\[a-zA-Z]+', '', suffix)
            suffix = re.sub(r'[{}]', '', suffix)  # Remove any leftover braces
            suffix = suffix.strip(' -')
            
            # Combine base text with suffix
            if suffix:
                full_text = f"{base_text} - {suffix}"
            else:
                full_text = base_text
            
            # Clean the final text
            clean_text = cleanLatexText(full_text)
            
            certifications.append({
                "url": url,
                "text": clean_text
            })
        else:
            # No href found, might be plain text
            clean_part = cleanLatexText(part)
            if clean_part and len(clean_part) > 5:
                certifications.append({
                    "url": "",
                    "text": clean_part
                })
    
    return certifications

def cleanLatexText(text):
    text = re.sub(r'\\textbf\{([^}]*)\}', r'**\1**', text)
    text = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    text = re.sub(r'\\%', '%', text)
    text = re.sub(r'\\&', '&', text)
    text = re.sub(r'\\\\', ' ', text)
    text = re.sub(r'\\\$', '$', text)
    text = re.sub(r'\\([#&%$_{}])', r'\1', text)
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()