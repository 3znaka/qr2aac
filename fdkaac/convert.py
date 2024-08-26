from pydub import AudioSegment
import subprocess
import os

# Путь к исходному файлу
input_file = "song.wav"
# Длительность отрезка в миллисекундах (15 секунд)
segment_duration = 15 * 1000

# Ввод первых двух символов от пользователя
prefix = input("Введите первые два символа для названия файлов: ")

# Загрузка аудиофайла
audio = AudioSegment.from_wav(input_file)
# Количество сегментов
num_segments = len(audio) // segment_duration + (1 if len(audio) % segment_duration else 0)

# Директория для временных отрезков
temp_dir = "temp_segments"
os.makedirs(temp_dir, exist_ok=True)

# Путь к fdkaac исполнителю
fdkaac_path = "C:\\gen\\fdkaac\\fdkaac.exe"  # Замените на актуальный путь

# Создание и кодирование сегментов
for i in range(num_segments):
    start_time = i * segment_duration
    end_time = start_time + segment_duration
    
    segment = audio[start_time:end_time]
    segment_name = f"segment_{i+1}.wav"
    segment_path = os.path.join(temp_dir, segment_name)
    
    # Сохранение сегмента
    segment.export(segment_path, format="wav")
    
    # Путь и имя для выходного файла
    output_file = f"{prefix}{str(i).zfill(4)}.m4a"
    
    # Команда для кодировки
    command = [
        fdkaac_path, 
        '-S', 
        '-p', '29',
        '-b', '16k',
        '--bandwidth', '8000',
        '-o', output_file,
        segment_path
    ]
    
    # Выполнение команды
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error encoding segment {i+1}: {result.stderr}")

# Очистка временных сегментных файлов
for file in os.listdir(temp_dir):
    os.remove(os.path.join(temp_dir, file))

# Удаление временной директории
os.rmdir(temp_dir)

print("Процесс завершен!")