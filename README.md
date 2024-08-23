# R-XMPP-CHAT
R-XMPP-CHAT is a chat application built using React and Vite, integrating XMPP protocol for real-time messaging. This project demonstrates various features including account management, one-to-one messaging, group chats, and presence management, aligned with the course objectives of understanding and implementing the XMPP protocol.

## Prerequisites
- Node.js >= 14.x
- Yarn package manager or nmp


## :computer: Technologies Used
* [React](https://es.react.dev/learn)
* [Vite](https://vitejs.dev/guide/)

## :notebook_with_decorative_cover: Installation

1. Clone the repository:
```
git clone git@github.com:FabianJuarez182/R-XMPP-CHAT.git
```
2. Install dependencies via Yarn:
```
cd r-xmpp-chat
yarn 
```

## :card_file_box: Use
As first point we must execute the development server:
```
yarn run dev
```
> Next, a window will open in your browser on the link http://localhost:5173. If not, open your browser at **http://localhost:5173** to view the application.

## Features
### Account Management
- Register, log in, log out, and delete an account on the XMPP server.

### Communication
- Show all contacts and their status
- Add a user to contacts
- Show contact details of a user
- 1 to 1 communication with any user/contact
- Participate in group conversations (bug recibed 2 message for one but implemented)
- Define presence message
- Send/receive notifications
- Send/receive files (not implemented)

## Project Presentation

During the project presentation, the following aspects were covered:
- Implemented Features: Account management, one-to-one communication, and presence management.
- Challenges: Implementing group chat functionality.
- Lessons Learned: The importance of understanding the XMPP protocol and debugging stanzas in real-time communication.
