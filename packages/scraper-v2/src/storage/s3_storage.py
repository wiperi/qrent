# storage/s3_storage.py - AWS S3 storage client for cloud backups
from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore[assignment]
    ClientError = Exception  # type: ignore[assignment]


class S3Storage:
    """Wrapper around boto3 for uploading backup artifacts."""

    def __init__(
        self,
        bucket_name: str,
        region_name: str = "ap-southeast-2",
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
    ) -> None:
        if boto3 is None:
            raise RuntimeError("boto3 is required for S3 operations.")
        self.bucket_name = bucket_name
        self.client = boto3.client(
            "s3",
            region_name=region_name,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    async def upload_backup(self, file_path: Path, remote_key: str) -> bool:
        """Upload a backup file to the configured S3 bucket."""
        return await asyncio.to_thread(self._upload_file, file_path, remote_key)

    def _upload_file(self, file_path: Path, remote_key: str) -> bool:
        try:
            self.client.upload_file(
                str(file_path),
                self.bucket_name,
                remote_key,
                ExtraArgs={
                    "ContentType": "application/json",
                    "StorageClass": "STANDARD",
                    "ServerSideEncryption": "AES256",
                    "Metadata": {
                        "scraped-at": datetime.now().isoformat(),
                        "source": "scraper-v2",
                        "file-size": str(file_path.stat().st_size),
                    },
                },
            )
            logger.info(f"S3 upload complete: {remote_key}")
            return True
        except ClientError as exc:  # pragma: no cover - log side effect only
            logger.error(f"S3 upload failed: {exc}")
            return False

    async def download_backup(self, remote_key: str, local_path: Path) -> bool:
        """Download a backup from S3."""
        return await asyncio.to_thread(self._download_file, remote_key, local_path)

    def _download_file(self, remote_key: str, local_path: Path) -> bool:
        try:
            self.client.download_file(self.bucket_name, remote_key, str(local_path))
            return True
        except ClientError as exc:  # pragma: no cover
            logger.error(f"S3 download failed: {exc}")
            return False

    async def list_backups(self, prefix: str = "backups/") -> List[Dict[str, Any]]:
        """List backup objects stored in the bucket."""
        return await asyncio.to_thread(self._list_objects, prefix)

    def _list_objects(self, prefix: str) -> List[Dict[str, Any]]:
        try:
            response = self.client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            return response.get("Contents", [])
        except ClientError as exc:  # pragma: no cover
            logger.error(f"S3 list failed: {exc}")
            return []
