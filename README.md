# 🏥 PulseQueue

PulseQueue is a real-time hospital queue management system that allows staff to manage patients and provides a public view of wait times.

---

## 🚀 Setup

1. Clone the repository:

```bash
git clone <repo-url>
cd PulseQueue
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

4. Run the app:

```bash
npm run dev
```

---

## ⚠️ Notes

* `.env` is not included for security reasons
* Use `.env.example` as a reference
* Firebase credentials must be provided separately or use your own Firebase project

---

## 🛠️ Tech Stack

* React (Vite)
* Firebase (Authentication + Firestore)

---

## 🔐 Security

* Firebase configuration is managed using environment variables
* Only authenticated users are allowed to modify data
