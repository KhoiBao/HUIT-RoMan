import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/auth/domain/user_role.dart';

void main() {
  test('maps staff roles case-insensitively', () {
    expect(UserRole.fromApi('admin'), UserRole.staff);
    expect(UserRole.fromApi('DepartmentManager'), UserRole.staff);
    expect(UserRole.fromApi('employee'), UserRole.staff);
    expect(UserRole.fromApi('Admin').isStaff, isTrue);
  });

  test('maps user roles and falls back to unknown', () {
    expect(UserRole.fromApi('Student'), UserRole.student);
    expect(UserRole.fromApi('lecturer'), UserRole.lecturer);
    expect(UserRole.fromApi(null), UserRole.unknown);
    expect(UserRole.fromApi('guest'), UserRole.unknown);
  });
}
