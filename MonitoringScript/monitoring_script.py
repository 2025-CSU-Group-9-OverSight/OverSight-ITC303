import psutil
import json
import websockets
import asyncio
import datetime
import platform
import os
import ssl

deviceDetails = platform.uname()

data = {
    'timestamp': None,
    'device': {
        'system': deviceDetails[0],
        'deviceName': deviceDetails[1],
        'release': deviceDetails[2],
        'version': deviceDetails[3],
        'machine': deviceDetails[4],
        'processor': deviceDetails[5]
    },
    'processes': [],
    'services': [],
    'disk': {
        'io': {},
        'partitions': {}
    },
    'cpu': {
        'logicalCores': psutil.cpu_count(logical=True), 
        'percentUsed': psutil.cpu_percent(percpu=True) # Assigns a value here to initialise the cache to avoid giving null value on first call
    },
    'ram': {
        'totalBytes': 0,
        'availableBytes': 0,
        'percentUsed': 0
    }
}

async def main():
    configFile = "config.json"

    # Load configuration from config.json file
    try:
        with open(configFile, 'r') as file:
            config = json.load(file)
            print("Configuration file successfully loaded.")
    except FileNotFoundError:
        print(f"ERROR: Configuration file '{configFile}' not found.")
        print("Please create config.json from config.example.json and configure it with your settings.")
        return
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in configuration file: {e}")
        return
    except Exception as e:
        print(f"ERROR: Failed to load configuration file: {e}")
        return

    # Validate required configuration fields
    required_fields = ["uri", "connection_attempts", "ping_interval", "ping_timeout", "bearer_token"]
    missing_fields = [field for field in required_fields if field not in config]
    
    if missing_fields:
        print(f"ERROR: Missing required configuration fields: {', '.join(missing_fields)}")
        print("Please check your config.json file against config.example.json")
        return

    # Validate field types and values
    try:
        if not isinstance(config["uri"], str) or not config["uri"].strip():
            raise ValueError("uri must be a non-empty string")
        if not isinstance(config["connection_attempts"], int) or config["connection_attempts"] < 1:
            raise ValueError("connection_attempts must be a positive integer")
        if not isinstance(config["ping_interval"], int) or config["ping_interval"] < 1:
            raise ValueError("ping_interval must be a positive integer")
        if not isinstance(config["ping_timeout"], int) or config["ping_timeout"] < 1:
            raise ValueError("ping_timeout must be a positive integer")
        if not isinstance(config["bearer_token"], str) or not config["bearer_token"].strip():
            raise ValueError("bearer_token must be a non-empty string")
            
        # Ensure positive values
        config["connection_attempts"] = abs(config["connection_attempts"])
        config["ping_interval"] = abs(config["ping_interval"])
        config["ping_timeout"] = abs(config["ping_timeout"])
        
    except ValueError as e:
        print(f"ERROR: Invalid configuration: {e}")
        print("Please check your config.json file against config.example.json")
        return

    print("Attempting to connect to server at URI " + config["uri"] + "...")

    connectionAttempts = 1

    while connectionAttempts < (config["connection_attempts"] + 1):
        try:
            # Setup SSL context for self-signed certificates
            ssl_context = None
            if config["uri"].startswith("wss://"):
                ssl_context = ssl.create_default_context()
                # Configure for self-signed certificates (OverSight uses self-signed certs)
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE

            # Setup authentication headers
            headers = {
                "Authorization": f"Bearer {config['bearer_token']}"
            }

            # Try with extra_headers first (newer websockets versions)
            try:
                websocket = await websockets.connect(
                    uri=config["uri"], 
                    ping_interval=config["ping_interval"], 
                    ping_timeout=config["ping_timeout"],
                    ssl=ssl_context,
                    extra_headers=headers
                )
            except TypeError:
                # Fallback for older websockets versions - use query parameter for token
                uri_with_token = f"{config['uri']}?token={config['bearer_token']}"
                websocket = await websockets.connect(
                    uri=uri_with_token, 
                    ping_interval=config["ping_interval"], 
                    ping_timeout=config["ping_timeout"],
                    ssl=ssl_context
                )
            
            async with websocket:
                print("Connection to server at URI " + config["uri"] + " successful.")
                connectionAttempts = 1
                while True:
                    # asyncio.gather means that the 5 second timer runs while data is being collected to minimise latency.
                    await asyncio.gather(
                        asyncio.sleep(5),
                        updateSend(websocket),
                    )
                    message = await websocket.recv()
                    print("Message Received: " + message)
                    
        except websockets.ConnectionClosed as e:
            # Don't think either end ever attempts to gracefully terminate the connection, so these are hard to test. Leaving them here in case we need them.
            #if e.rcvd != None:
                #print("Connection close frame received. Reason: " + e.rcvd.reason + ". Code: " + e.rcvd.code)
                #break
            #if e.sent != None:
                #print("Connection close frame sent. Reason: " + e.sent.reason + ". Code: " + e.sent.code)
                #break
            print("Connection unexpectedly closed. Attempting to re-establish connection with server...")
            pass
        except ConnectionRefusedError as e:
            print("Connection attempt " + str(connectionAttempts) + " unsuccessful. Attempting to re-establish connection with server...")
            connectionAttempts += 1
            pass
        except websockets.InvalidURI as e:
            print("The supplied URI isn't valid, or the scheme isn't ws or wss: " + config["uri"] + ".")
            break
        except Exception as e:
            print("An error has occured: " + str(e))
            break
    if connectionAttempts > 1:
        print("Connection to server at URI " + config["uri"] + " failed after " + str(config["connection_attempts"]) + " attempts.")



async def updateTimestamp():
    global data
    # Gets the current date and time and adds it to the data.
    # Casts to String to make the JSON dump like it.
    data['timestamp'] = str(datetime.datetime.now())

async def updateProcesses():
    # Get global data variable
    global data
    # Get iterable of all processes
    processes = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status'])
    # Clear the processes field of data
    data['processes'] = []
    # Append all processes and their info
    for proc in processes:
        data['processes'].append(proc.info)

async def updateServices():
    if deviceDetails[0] == 'Windows':
        print("Windows stuff")
        # Get global data variable
        global data
        # Get iterable of all Windows services
        services = psutil.win_service_iter()
        # Clear the services field of data
        data['services'] = []
        # Append all services and their info
        for serv in services:
            data['services'].append({
                'pid': serv.pid(),
                'name': serv.name(),
                'display_name': serv.display_name(),
                'start_type': serv.start_type(),
                'status': serv.status()
            })

async def updateDisk():
    # Get global data variable
    global data
    # Get named tuple of disk info
    diskIO = psutil.disk_io_counters(perdisk=True)
    # Save named tuple to data
    # Format - {'drive name': sdiskio(read_count=0, write_count=0, read_bytes=0, write_bytes=0, read_time=0, write_time=0), ...}
    data['disk']['io'] = diskIO
    
    # Collect disk usage for all available partitions
    disk_partitions = psutil.disk_partitions()
    disk_usage_data = {}
    
    for partition in disk_partitions:
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disk_usage_data[partition.device] = {
                'mountpoint': partition.mountpoint,
                'fstype': partition.fstype,
                'total': usage.total,
                'used': usage.used,
                'free': usage.free,
                'percent': usage.percent
            }
        except (OSError, PermissionError):
            # Skip partitions we can't access
            continue
    
    # Store all disk usage data
    data['disk']['partitions'] = disk_usage_data

async def updateCPU():
    # Get global data variable
    global data
    # Save CPU stats to data
    data['cpu']['percentUsed'] = psutil.cpu_percent(percpu=True)

async def updateMemory():
    # Get global data variable
    global data
    # Get memory information
    virtualMemory = psutil.virtual_memory()
    # Save memory info to each field in data
    data['ram']['totalBytes'] = virtualMemory.total
    data['ram']['availableBytes'] = virtualMemory.available
    data['ram']['percentUsed'] = virtualMemory.percent

async def updateAll():
    # All of the update functions at once
    await updateTimestamp()
    await updateProcesses()
    await updateServices()
    await updateDisk()
    await updateCPU()
    await updateMemory()

async def sendData(websocket):
    # Uses the supplied Websocket connection to dump all data
    await websocket.send(json.dumps(data))

async def updateSend(websocket):
    # Performs both the update and send in that order
    await updateAll()
    await sendData(websocket)

if __name__ == "__main__":
    asyncio.run(main())