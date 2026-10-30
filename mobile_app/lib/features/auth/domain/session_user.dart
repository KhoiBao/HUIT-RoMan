import 'user_role.dart';

class SessionUser {
  const SessionUser({
    required this.id,
    required this.cardCode,
    required this.fullName,
    required this.email,
    required this.role,
    this.departmentName,
    this.phone,
  });

  final int id;
  final String cardCode;
  final String fullName;
  final String email;
  final UserRole role;
  final String? departmentName;
  final String? phone;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.take(2).map((p) => p[0]).join().toUpperCase();
  }

  factory SessionUser.fromJson(Map<String, dynamic> json) {
    final roleValue =
        json['role'] ?? json['roleName'] ?? json['userRole'] ?? json['roleId'];
    return SessionUser(
      id: (json['id'] ?? json['userId'] ?? 0) as int,
      cardCode: (json['cardCode'] ?? json['userName'] ?? json['username'] ?? '')
          .toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: UserRole.fromApi(roleValue?.toString()),
      departmentName: json['departmentName'] as String?,
      phone: (json['phoneNumber'] ?? json['phone']) as String?,
    );
  }
}
