# 포장지 사진 OCR 서버 (PaddleOCR, 무료 오픈소스). 모델 파일은 /cache(= storage/cache/paddleocr)에 저장
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir paddlepaddle paddleocr
ENV PADDLE_PDX_CACHE_HOME=/cache PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
WORKDIR /app
COPY server.py .
EXPOSE 8866
CMD ["python", "server.py"]
