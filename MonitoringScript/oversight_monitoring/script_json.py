import psutil
import json
import time

procs = None

def main():
    send_report()
    while True:
        time.sleep(5)
        send_report()

    
def send_report():
    data = [
        
    ]
    
    procs = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status'])
    
    for proc in procs:
        data.append(
            {'pid': str(proc.pid), 
            'name': str(proc.name()),
            'cpu_percent': str(proc.cpu_percent()),
            'memory_percent': str(proc.memory_percent()),
            'io_counters': str(proc.io_counters()),
            'status': str(proc.status())}
        )
        
    print(json.dumps(data))

main()