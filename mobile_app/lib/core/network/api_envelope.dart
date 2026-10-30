class ApiEnvelope {
  const ApiEnvelope({required this.success, this.message, this.data});

  final bool success;
  final String? message;
  final dynamic data;

  factory ApiEnvelope.fromJson(Map<String, dynamic> json) => ApiEnvelope(
        success: json['success'] == true,
        message: json['message'] as String?,
        data: json['data'],
      );
}

List<Map<String, dynamic>> asList(dynamic data) {
  final raw = data is Map && data['items'] is List ? data['items'] : data;
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList(growable: false);
}

Map<String, dynamic> asMap(dynamic data) {
  if (data is Map) return Map<String, dynamic>.from(data);
  return const {};
}
