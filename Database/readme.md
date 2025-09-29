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
1. **Stop MongoDB**
   ```
   sudo systemctl stop mongod.service
   ```
2. **Edit the MongoDB config**
   ```
   sudo nano /etc/mongod.conf
   ```
   Replace *#security* and *#replication* with
   ```
   security:
     authorization: enabled
     keyFile: /etc/mongodb/keyfile

   replication:
      replSetName: "rs0"
   ```
   Optional: Add a local ip to allow network access
   ```
   bindIp: 127.0.0.1, XX.XX.XX.XX
   ```
   Save and exit
3. **Generate the keyfile and set its permissions**
   ```
   sudo mkdir /etc/mongodb
   sudo openssl rand -base64 756 | sudo tee /etc/mongodb/keyfile
   sudo chown mongodb:mongodb /etc/mongodb/keyfile
   sudo chmod 400 /etc/mongodb/keyfile
   ```
4. **Restart MongoDB and verify it is running** 
   ```
   sudo systemctl start mongod.service
   sudo systemctl status mongod.service
   ```
5. **Connect to MongoDB with mongosh**
   ```
   mongosh --port 27017
   ```
6. **Initiate the replica set**
   ```
   rs.initiate()
   rs.status()
   ```
7. **Switch to the admin database**
   ```
   use admin
   ```
8. **Create the admin and application users**  
   Create the admin user user
   ```
   db.createUser(
      {
      user: "DBAdmin",
      pwd: passwordPrompt(), // or cleartext password
      roles: [
         { role: "root", db: "admin" }
      ]
      }
   )
   ```
   Login as the admin user
   ```
   db.auth("DBAdmin", passwordPrompt())
   ```
   Create the application user
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
9. **Exit mongosh and stop MongoDB**
   ```
   .exit
   ```
10. **The connection strings will now be**  
   ```mongodb://DBAdmin:ADMIN_PASSOWRD@localhost:27017/```  
   ```mongodb://OverSight:APPLICATION_PASSOWRD@localhost:27017/``` 

## References
[Install MongoDB Community Edition on Ubuntu](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu)  
[Use SCRAM to Authenticate Clients on Self-Managed Deployments](https://www.mongodb.com/docs/manual/tutorial/configure-scram-client-authentication/)  