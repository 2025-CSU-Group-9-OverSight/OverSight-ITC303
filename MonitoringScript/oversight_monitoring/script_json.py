import psutil
import json
import time
import sys
import websockets
import asyncio
import datetime
import platform

#Note: More work has to be done on this, but it seems to mostly work.

processCache = {}
serviceCache = {}

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

print(sys.executable)

async def main(uri):
    global data
    print(platform.uname()[0])

    async with websockets.connect(uri) as websocket:
        
        await websocket.send('Hello World!')
        response = await websocket.recv()
        print(response)
    
        await createData()
        await websocket.send(json.dumps(data))
        while True:
            time.sleep(5)
            await createData()
            await websocket.send(json.dumps(data))

async def updateProcesses():
    global processCache

    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status']):
        if proc.pid not in processCache:
            processCache[proc.pid] = proc
            
    snapshot = []
    for pid, proc in list(processCache.items()):
        try:
            snapshot.append({
                'pid': str(proc.pid),
                'name': str(proc.name()),
                'cpu_percent': str(proc.cpu_percent()),
                'memory_percent': str(proc.memory_percent()),
                'io_counters': str(proc.io_counters()),
                'status': str(proc.status())
            })
        except psutil.NoSuchProcess:
            processCache.pop(pid, None)
    
    return snapshot

async def updateServices():
    global serviceCache

    for serv in psutil.win_service_iter():
        if serv.pid not in serviceCache:
            serviceCache[serv.pid] = serv
    
    snapshot = []
    for pid, serv in list(serviceCache.items()):
        try:
            snapshot.append({
                'pid': str(serv.pid()),
                'name': str(serv.name()),
                'display_name': str(serv.display_name()),
                'cpu_percent': str(psutil.Process(serv.pid()).cpu_percent()),
                'memory_percent': str(psutil.Process(serv.pid()).memory_percent()),
                'io_counters': str(psutil.Process(serv.pid()).io_counters()),
                'start_type': str(serv.start_type()),
                'status': str(serv.status())
            })
        except psutil.NoSuchProcess:
            serviceCache.pop(pid, None)
    
    return snapshot


async def updateDisk():
    diskDict = {}
    diskInfo = psutil.disk_io_counters(perdisk=True)
    diskNames = diskInfo.keys()

    for i in diskNames:
        diskDict.update({i: {
            'read_count': diskInfo.get(i)[0],
            'write_count': diskInfo.get(i)[1],
            'read_bytes': diskInfo.get(i)[2],
            'write_bytes': diskInfo.get(i)[3],
            'read_time': diskInfo.get(i)[4],
            'write_time': diskInfo.get(i)[5]
            }})
    return diskDict

async def createData():
    global data
    data['timestamp'] = str(datetime.datetime.now())
    procecessSnapshot = updateProcesses()
    data['processes'] = await procecessSnapshot
    serviceSnapshot = updateServices()
    data['services'] = await serviceSnapshot
    disks = updateDisk()
    data['disk'] = await disks
    cpu = psutil.cpu_percent(percpu=True)
    data['cpu']['percentUsed'] = cpu
    virtualMemory = psutil.virtual_memory()
    data['ram']['totalBytes'] = virtualMemory.total
    data['ram']['availableBytes'] = virtualMemory.available
    data['ram']['percentUsed'] = virtualMemory.percent

if __name__ == "__main__":
    websocket_uri = "ws://localhost:3000/api/ws"
    asyncio.run(main(websocket_uri))