"""Basic tests for the monitoring scripts."""

import pytest
from oversight_monitoring import __version__
from oversight_monitoring.system_monitor import get_system_info


def test_version():
    """Test that version is defined."""
    assert __version__ == "0.1.0"


def test_system_info():
    """Test system info collection."""
    info = get_system_info()
    assert "hostname" in info


def test_basic_functionality():
    """Test basic functionality."""
    # Add actual tests as monitoring functionality is developed
    assert True