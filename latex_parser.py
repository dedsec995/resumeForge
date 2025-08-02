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
    pattern = r'\\workExSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}'
    matches = re.finditer(pattern, content)
    
    for match in matches:
        company, jobTitle, location, duration = match.groups()
        
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
    pattern = r'\\resumeProjectHeading\{.*\}\{([^}]+)\}(?:\s*\\\\)'
    matches = list(re.finditer(pattern, content))
    
    for i, match in enumerate(matches):
        techStack = match.group(1)
        
        headingStart = match.start()
        headingEnd = match.end()
        fullHeading = content[headingStart:headingEnd]
        
        namePattern = r'\\textbf\{\{([^}]+)\}\}'
        nameMatch = re.search(namePattern, fullHeading)
        if nameMatch:
            projectName = nameMatch.group(1)
        else:
            fallbackPattern = r'\\resumeProjectHeading\{([^{}]*)\}'
            fallbackMatch = re.search(fallbackPattern, fullHeading)
            projectName = fallbackMatch.group(1) if fallbackMatch else "Unknown Project"
        
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
            "duration": "",
            "bulletPoints": bulletPoints
        })
    
    return projects

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