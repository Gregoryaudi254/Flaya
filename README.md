Flaya

Cross-Platform Social & Utility App built with React Native & Expo

Project Overview

Flaya is a social networking and community engagement app designed to connect users within local areas. Users can share posts, stories, and updates visible to people nearby, enabling real-time interactions, community building, and access to local information. The app emphasizes scalability, reliability, and a modular code architecture for future feature growth.

Key Features

User Accounts & Authentication: Secure login and registration using Firebase Auth.

Location-Based Interaction: Posts and stories visible to users within a configurable radius.

Real-Time Updates: Firestore integration enables live updates for posts, stories, and interactions.

Media Support: Upload and view images and videos seamlessly.

State Management: Centralized state using Redux slices for scalable application logic.

Cross-Platform Compatibility: Fully functional on Android, iOS, and web via Expo.

Tech Stack

Frontend: React Native, React, Expo

Backend / Database: Firebase Firestore, Firebase Cloud Functions

Language: JavaScript (primary), TypeScript (minor)

State Management: Redux / Redux Toolkit

Navigation: React Navigation

Development Tools: Git/GitHub, ESLint, Prettier

Project Structure
/app
 ├─ /components      # Reusable UI components
 ├─ /constants       # App-wide constants
 ├─ /functions       # Helper functions & business logic
 ├─ /hooks           # Custom hooks
 ├─ /screens         # App screens
 ├─ /slices          # Redux slices
 ├─ /store           # Redux store configuration
 └─ App.js           # Entry point

Setup & Installation

Clone the repository:

git clone https://github.com/Gregoryaudi254/Flaya.git


Navigate to the project folder:

cd Flaya


Install dependencies:

npm install


Start the Expo development server:

expo start


Open the app on a simulator or your mobile device using the Expo Go app.

Usage

Users can register and log in.

Create posts or stories visible to nearby users.

Interact with posts (likes, comments).

Upload media content (images/videos).

Explore real-time community updates.

Contributions

This project was built and maintained solely by Gregory Otieno as a personal portfolio and real-world application project. Contributions from others are welcome through pull requests.

Contact

Gregory Otieno
Email: otile992@gmail.com

GitHub: github.com/Gregoryaudi254
