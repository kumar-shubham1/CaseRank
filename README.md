# CaseRank ⚖️ 
**AI-Powered Judiciary Case Backlog Reduction**

## 🎯 What it does
CaseRank acts as a smart "triage" system for pending legal cases. It accepts manual case entries or document uploads (.txt), analyzes the unstructured text using **Google Gemini AI**, and automatically extracts:
- A concise summary
- A priority unlevel (High/Medium/Low)
- A clear reason *why* the case should be prioritized (Explainable AI)

It also factors in the **delay** (how long the case has been pending) to ensure older cases don't get buried. 

## 🛠 Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, Custom CSS (Premium Glassmorphic Design)
- **Backend**: Node.js, Express.js, Multer (In-memory storage for hackathon simplicity)
- **AI**: `@google/generative-ai` (Gemini 2.0 Flash)

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js installed on your machine.
- A Google Gemini API Key. (Get one at [Google AI Studio](https://aistudio.google.com/)).

### 2. Setup
1. Open a terminal and navigate to the project root folder.
2. Go to the `backend` directory:
   ```bash
   cd backend
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

### 3. Add Environment Variables
In the `backend` directory, create a `.env` file (or copy the provided `.env.example`) and add your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
```

### 4. Start the Application
While inside the `backend` directory, run:
```bash
npm start
```
*(You should see a message saying "🚀 CaseRank server running at http://localhost:3000")*

### 5. Access the App
Open your web browser and go to:
**http://localhost:3000**
