import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../application/auth_providers.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _token = TextEditingController();
  final _password = TextEditingController();
  int _step = 0;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .forgotPassword(_identifier.text.trim());
      if (!mounted) return;
      setState(() {
        _step = 1;
        _busy = false;
      });
    } on AppException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không gửi được mã xác nhận';
        _busy = false;
      });
    }
  }

  Future<void> _reset() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).resetPassword(
            _identifier.text.trim(),
            _token.text.trim(),
            _password.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đặt lại mật khẩu thành công. Hãy đăng nhập lại.'),
        ),
      );
      context.pop();
    } on AppException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không đặt lại được mật khẩu';
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quên mật khẩu')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: _step == 0
                              ? AppColors.primary
                              : AppColors.success,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: _step == 0
                            ? const Text('1',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700))
                            : const Icon(Icons.check, size: 20, color: Colors.white),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      const Expanded(
                        child: Text(
                          'Xác nhận tài khoản',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.navy,
                          ),
                        ),
                      ),
                      Container(width: 28, height: 1, color: AppColors.line),
                      const SizedBox(width: AppSpacing.sm),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: _step == 1
                              ? AppColors.primary
                              : const Color(0xFFEEF2F7),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '2',
                          style: TextStyle(
                            color: _step == 1 ? Colors.white : AppColors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  _step == 0 ? 'Nhập tài khoản của bạn' : 'Nhập mã và mật khẩu mới',
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _step == 0
                      ? 'Mã xác nhận sẽ được gửi tới email HUIT đã đăng ký.'
                      : 'Dùng mã xác nhận trong email và đặt mật khẩu mới tối thiểu 6 ký tự.',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.muted, height: 1.5),
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_step == 0)
                  TextFormField(
                    controller: _identifier,
                    decoration: const InputDecoration(
                      labelText: 'Email hoặc MSSV/Mã CBVC',
                      prefixIcon: Icon(Icons.badge_outlined, size: 20),
                    ),
                    validator: Validators.loginIdentifier,
                  )
                else ...[
                  TextFormField(
                    controller: _token,
                    decoration: const InputDecoration(
                      labelText: 'Mã xác nhận',
                      prefixIcon: Icon(Icons.pin_outlined, size: 20),
                    ),
                    validator: Validators.otp,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  TextFormField(
                    controller: _password,
                    obscureText: _obscure,
                    decoration: InputDecoration(
                      labelText: 'Mật khẩu mới',
                      prefixIcon: const Icon(Icons.lock_outline, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(_obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: Validators.newPassword,
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(AppRadius.input),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(
                          color: AppColors.danger, fontSize: 13, height: 1.4),
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: _step == 0 ? 'Gửi mã xác nhận' : 'Đặt lại mật khẩu',
                  loading: _busy,
                  onPressed: _busy ? null : (_step == 0 ? _sendCode : _reset),
                ),
                if (_step == 1) ...[
                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                              _step = 0;
                              _error = null;
                            }),
                    child: const Text('Dùng tài khoản khác'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
