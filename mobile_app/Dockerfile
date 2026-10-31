# Build APK Android trong container: máy host không cần cài Flutter/Android SDK.
FROM ghcr.io/cirruslabs/flutter:3.44.0 AS build

# Image chỉ phát hành tới 3.44.0, còn project yêu cầu Dart ^3.13.7 (Flutter 3.47.x),
# nên thay SDK đi kèm image bằng đúng bản stable dùng ở máy dev.
ARG FLUTTER_VERSION=3.47.9

RUN set -eux; \
    if ! command -v curl >/dev/null || ! command -v xz >/dev/null; then \
      apt-get update; \
      apt-get install -y --no-install-recommends curl xz-utils; \
      rm -rf /var/lib/apt/lists/*; \
    fi; \
    curl -fsSL -o /tmp/flutter.tar.xz \
      "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"; \
    rm -rf "$FLUTTER_HOME"; \
    tar -xJf /tmp/flutter.tar.xz -C "$(dirname "$FLUTTER_HOME")"; \
    rm /tmp/flutter.tar.xz; \
    git config --system --add safe.directory "$FLUTTER_HOME"

WORKDIR /workspace
RUN flutter --version && flutter precache --android

# Tách lớp pub get khỏi mã nguồn để sửa code Dart không phải tải lại package.
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

ARG API_BASE_URL=http://10.0.2.2:5056
RUN flutter build apk --debug --dart-define=API_BASE_URL="${API_BASE_URL}"

FROM alpine:3.20 AS artifact
WORKDIR /out
COPY --from=build /workspace/build/app/outputs/flutter-apk/app-debug.apk ./app-debug.apk
ENTRYPOINT ["sh", "-c", "cp -f /out/app-debug.apk /host/app-debug.apk && ls -lh /host/app-debug.apk"]
