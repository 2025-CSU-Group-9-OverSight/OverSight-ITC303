# MongoDB Setup

## Table of Contents
- [Installation](#installation)
- [Authentication Setup](#authentication-setup)
- [References](#references)

## Prerequisites
**Ubuntu Server** (v24.04): [ubuntu.com](https://ubuntu.com/download/server)

## Installation

1. **Install gnupg and curl**  
   ```
   sudo apt-get install gnupg curl
   ```
2. **Import the public key**  
   ```
   curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
      sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
      --dearmor
   ```
3. **Create the list file for Ubuntu 24.04 (Noble)**  
   ```
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
   ```
4. **Reload the package database**  
   ```
   sudo apt-get update
   ```  
5. **Install MongoDB Community Server**  
   ```
   sudo apt-get install -y mongodb-org
   ```  
6. **Setup MongoDB to run as a service**  
   ```
   sudo systemctl enable mongod.service
   ```  
7. **Start MongoDB and verify it is running** 
   ```
   sudo systemctl start mongod.service
   sudo systemctl status mongod.service
   ```
## Authentication Setup
1. **Connect to MongoDB with mongosh**
   ```
   mongosh --port 27017
   ```
2. **Switch to the admin database**
   ```
   use admin
   ```
3. **Create the admin and application users**
   ```
   db.createUser(
		  {
			user: "DBAdmin",
			pwd: passwordPrompt(), // or cleartext password
			roles: [
			  { role: "userAdminAnyDatabase", db: "admin" },
			  { role: "readWriteAnyDatabase", db: "admin" }
			]
		  }
		)
   ```
   ```
   db.createUser(
		  {
			user: "OverSight",
			pwd: passwordPrompt(), // or cleartext password
			roles: [
			  { role: "dbAdmin", db: "oversight" },
			  { role: "readWrite", db: "oversight" },
			  { role: "dbAdmin", db: "test" },
			  { role: "readWrite", db: "test" }
			]
		  }
		)
   ```
6. **Exit mongosh and stop MongoDB**
   ```
   .exit
   ```
   ```
   sudo systemctl stop mongod
   ```
7. **Edit the MongoDB config and enable authorization**
   ```
   sudo sudo nano /etc/mongod.conf
   ```
   Replace *#security* with
   ```
   security:
     authorization: enabled
   ```
   Save and exit
8. **Restart MongoDB and verify it is running** 
   ```
   sudo systemctl start mongod.service
   sudo systemctl status mongod.service
   ```

9. **The connection strings will now be**  
   ```mongodb://DBAdmin:ADMIN_PASSOWRD@localhost:27017/```  
   ```mongodb://OverSight:APPLICATION_PASSOWRD@localhost:27017/```  

## References
[Install MongoDB Community Edition on Ubuntu](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu)  
[Use SCRAM to Authenticate Clients on Self-Managed Deployments](https://www.mongodb.com/docs/manual/tutorial/configure-scram-client-authentication/)  