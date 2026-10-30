abstract final class Validators {
  static final _email = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.]+$');
  static final _code = RegExp(r'^[A-Za-z0-9._-]{3,50}$');

  static String? loginIdentifier(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Nhập email, MSSV hoặc mã CBVC';
    if (v.contains('@')) {
      return _email.hasMatch(v) ? null : 'Email không hợp lệ';
    }
    return _code.hasMatch(v) ? null : 'Mã phải từ 3–50 ký tự chữ, số';
  }

  static String? password(String? value) =>
      (value == null || value.isEmpty) ? 'Nhập mật khẩu' : null;

  static String? newPassword(String? value) =>
      (value == null || value.length < 6) ? 'Mật khẩu tối thiểu 6 ký tự' : null;

  static String? requiredText(String? value, String label, {int min = 1}) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Nhập $label';
    if (v.length < min) return '$label tối thiểu $min ký tự';
    return null;
  }

  static String? otp(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Nhập mã xác nhận';
    return null;
  }
}
