# Use the official Python image as the base image
FROM jjanzic/docker-python3-opencv

# Set the working directory inside the container
WORKDIR /app

# Copy the local Python script to the container's working directory
COPY opencv.py /app/
COPY images/ /app/images/

# Run the Python script when the container starts
CMD ["python", "opencv.py"]