import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../application/auth_providers.dart';

class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() =>
      _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .changePassword(_current.text, _new.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đổi mật khẩu thành công.'),
          behavior: SnackBarBehavior.floating,
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
        _error = 'Không đổi được mật khẩu. Vui lòng thử lại.';
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đổi mật khẩu')),
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
                    color: AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.15)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.shield_outlined,
                          size: 20, color: AppColors.primary),
                      SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          'Mật khẩu mới tối thiểu 6 ký tự và khác mật khẩu cũ.',
                          style: TextStyle(
                              fontSize: 12.5, height: 1.5),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                TextFormField(
                  key: const Key('change-current'),
                  controller: _current,
                  obscureText: _obscure,
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu hiện tại',
                    prefixIcon: Icon(Icons.lock_outline, size: 20),
                  ),
                  validator: (value) =>
                      (value == null || value.isEmpty)
                          ? 'Nhập mật khẩu hiện tại'
                          : null,
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  key: const Key('change-new'),
                  controller: _new,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu mới',
                    prefixIcon: const Icon(Icons.lock_reset_outlined, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: Validators.newPassword,
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  key: const Key('change-confirm'),
                  controller: _confirm,
                  obscureText: _obscure,
                  decoration: const InputDecoration(
                    labelText: 'Xác nhận mật khẩu mới',
                    prefixIcon: Icon(Icons.lock_reset_outlined, size: 20),
                  ),
                  validator: (value) =>
                      value != _new.text ? 'Mật khẩu xác nhận không khớp' : null,
                ),
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
                  key: const Key('change-submit'),
                  label: 'Xác nhận đổi mật khẩu',
                  loading: _busy,
                  onPressed: _busy ? null : _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
