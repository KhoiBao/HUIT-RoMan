enum UserRole {
  student,
  lecturer,
  staff,
  unknown;

  static const _staffValues = {
    'admin',
    'manager',
    'departmentmanager',
    'employee',
  };

  static UserRole fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v == 'student') return UserRole.student;
    if (v == 'lecturer' || v == 'teacher') return UserRole.lecturer;
    if (_staffValues.contains(v)) return UserRole.staff;
    return UserRole.unknown;
  }

  bool get isStaff => this == UserRole.staff;
  bool get isStudent => this == UserRole.student;

  String get label => switch (this) {
        UserRole.student => 'Sinh viên',
        UserRole.lecturer => 'Giảng viên',
        UserRole.staff => 'Nhân sự',
        UserRole.unknown => 'Người dùng',
      };
}
