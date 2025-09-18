import psutil
import json
import websockets
import asyncio
import datetime
import platform

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
    'disk': {},
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

async def main(uri):
    async with websockets.connect(uri) as websocket:
        while True:
            await asyncio.gather(
                asyncio.sleep(5),
                updateSend(websocket),
            )

async def updateTimestamp():
    global data

    data['timestamp'] = str(datetime.datetime.now())

async def updateProcesses():
    global data
    
    processes = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status'])
    
    data['processes'] = []
    for proc in processes:
        data['processes'].append(proc.info)

async def updateServices():
    global data
    
    services = psutil.win_service_iter()
    
    data['services'] = []
    for serv in services:
        data['services'].append({
            'pid': serv.pid(),
            'name': serv.name(),
            'display_name': serv.display_name(),
            'start_type': serv.start_type(),
            'status': serv.status()
        })

async def updateDisk():
    global data

    # Collect disk I/O counters
    disks = psutil.disk_io_counters(perdisk=True)
    data['disks'] = disks
    
    # Collect disk usage percentage for the root drive
    try:
        disk_usage = psutil.disk_usage('/')
        data['disk']['usage'] = (disk_usage.used / disk_usage.total) * 100
    except (OSError, PermissionError):
        # Fallback for Windows systems - try C: drive
        try:
            disk_usage = psutil.disk_usage('C:')
            data['disk']['usage'] = (disk_usage.used / disk_usage.total) * 100
        except (OSError, PermissionError):
            # If both fail, set to 0
            data['disk']['usage'] = 0

async def updateCPU():
    global data

    data['cpu']['percentUsed'] = psutil.cpu_percent(percpu=True)

async def updateMemory():
    global data

    virtualMemory = psutil.virtual_memory()
    data['ram']['totalBytes'] = virtualMemory.total
    data['ram']['availableBytes'] = virtualMemory.available
    data['ram']['percentUsed'] = virtualMemory.percent

async def updateAll():
    await updateTimestamp()
    await updateProcesses()
    await updateServices()
    await updateDisk()
    await updateCPU()
    await updateMemory()

async def sendData(websocket):
    await websocket.send(json.dumps(data))

async def updateSend(websocket):
    await updateAll()
    await sendData(websocket)

if __name__ == "__main__":
    websocket_uri = "ws://localhost:3000/api/ws/monitoring"
    asyncio.run(main(websocket_uri))