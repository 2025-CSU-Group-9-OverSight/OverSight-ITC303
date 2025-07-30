"""System monitoring module."""


def get_system_info() -> Dict[str, Any]:
    """Get basic system information.
    
    Returns:
        Dictionary containing system information.
    """
    return {
        "platform": "Windows",
        "platform_release": "10",
        "platform_version": "10.0.19041.1",
        "architecture": "x86_64",
        "hostname": "DESKTOP-123456",
        "processor": "Intel(R) Core(TM) i7-8550U CPU @ 1.80GHz",
    }


def main() -> None:
    """Main entrypoint for the system monitoring script."""
    while True:
        info = get_system_info()
        print("System Information:")
        for key, value in info.items():
            print(f"  {key}: {value}")
        time.sleep(1)


if __name__ == "__main__":
    main()