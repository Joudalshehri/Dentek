# Dentek

Dentek is an AI-powered dental X-ray analysis system that assists dentists in detecting:

- Periapical Lesions
- Impacted Teeth

The system allows dentists to upload panoramic X-rays, analyze them using AI models, view generated reports, add doctor notes, and download reports.

---

## Prerequisites

Make sure the following software is installed:

- Python 3.10 or later
- Node.js
- npm
- MariaDB

---

## Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables in the `.env` file.

Run database migrations:

```bash
python manage.py migrate
```

Start the backend server:

```bash
python manage.py runserver
```

Backend will run at:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

Open a new terminal.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the frontend application:

```bash
npm run dev
```

Frontend will run at:

```text
http://localhost:5173
```

---

## System Workflow

1. Login to the system
2. Add a patient
3. Upload a panoramic X-ray
4. Run AI analysis
5. View the generated report
6. Add doctor notes
7. Download the report

