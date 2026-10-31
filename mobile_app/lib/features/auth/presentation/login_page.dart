import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../application/auth_controller.dart';
import 'widgets/topography_background.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _identifierFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _obscure = true;
  String? _submitError;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _identifierFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitError = null);
    if (!(_formKey.currentState?.validate() ?? false)) {
      _identifierFocus.requestFocus();
      return;
    }
    final ok = await ref.read(authControllerProvider.notifier).login(
          _identifier.text.trim(),
          _password.text,
        );
    if (!mounted) return;
    if (!ok) {
      HapticFeedback.mediumImpact();
      setState(() {
        _submitError = ref.read(authControllerProvider).error ??
            'Đăng nhập thất bại, vui lòng thử lại';
      });
      if (_submitError!.toLowerCase().contains('mật khẩu')) {
        _passwordFocus.requestFocus();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Stack(
        children: [
          const Positioned.fill(child: TopographyBackground()),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xl, AppSpacing.xl, AppSpacing.xl, AppSpacing.xl),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - AppSpacing.xl * 2,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: AppSpacing.xl),
                      Center(
                        child: Image.asset(
                          'assets/images/roman-logo-icon.png',
                          width: 84,
                          height: 84,
                          filterQuality: FilterQuality.high,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      const Text(
                        'HUIT',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đặt phòng học thông minh',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.68),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(AppRadius.sheet),
                          boxShadow: appShadow,
                        ),
                        child: AutofillGroup(
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Text(
                                  'Đăng nhập',
                                  style: TextStyle(
                                    fontSize: 21,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.navy,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Dùng tài khoản HUIT của bạn',
                                  style: TextStyle(
                                      fontSize: 13, color: AppColors.muted),
                                ),
                                const SizedBox(height: AppSpacing.xl),
                                TextFormField(
                                  key: const Key('login-identifier'),
                                  controller: _identifier,
                                  focusNode: _identifierFocus,
                                  keyboardType: TextInputType.text,
                                  autofillHints: const [AutofillHints.username],
                                  textInputAction: TextInputAction.next,
                                  style: const TextStyle(fontSize: 15),
                                  decoration: const InputDecoration(
                                    labelText: 'Email hoặc MSSV/Mã CBVC',
                                    prefixIcon:
                                        Icon(Icons.badge_outlined, size: 20),
                                  ),
                                  validator: Validators.loginIdentifier,
                                  onFieldSubmitted: (_) =>
                                      _passwordFocus.requestFocus(),
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                TextFormField(
                                  key: const Key('login-password'),
                                  controller: _password,
                                  focusNode: _passwordFocus,
                                  obscureText: _obscure,
                                  autofillHints: const [AutofillHints.password],
                                  textInputAction: TextInputAction.done,
                                  style: const TextStyle(fontSize: 15),
                                  decoration: InputDecoration(
                                    labelText: 'Mật khẩu',
                                    prefixIcon:
                                        const Icon(Icons.lock_outline, size: 20),
                                    suffixIcon: IconButton(
                                      tooltip: _obscure
                                          ? 'Hiện mật khẩu'
                                          : 'Ẩn mật khẩu',
                                      icon: Icon(
                                        _obscure
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        size: 20,
                                      ),
                                      onPressed: () =>
                                          setState(() => _obscure = !_obscure),
                                    ),
                                  ),
                                  validator: Validators.password,
                                  onFieldSubmitted: (_) => _submit(),
                                ),
                                if (_submitError != null) ...[
                                  const SizedBox(height: AppSpacing.md),
                                  Container(
                                    padding: const EdgeInsets.all(
                                        AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFEBEE),
                                      borderRadius:
                                          BorderRadius.circular(AppRadius.input),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.error_outline,
                                          size: 16,
                                          color: AppColors.danger,
                                        ),
                                        const SizedBox(width: AppSpacing.sm),
                                        Expanded(
                                          child: Text(
                                            _submitError!,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppColors.danger,
                                              height: 1.4,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                const SizedBox(height: AppSpacing.lg),
                                AppButton(
                                  key: const Key('login-submit'),
                                  label: 'Đăng nhập',
                                  loading: auth.busy,
                                  onPressed: auth.busy ? null : _submit,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: () =>
                                        context.push('/forgot-password'),
                                    style: TextButton.styleFrom(
                                      minimumSize: const Size(48, 44),
                                    ),
                                    child: const Text(
                                      'Quên mật khẩu?',
                                      style: TextStyle(fontSize: 13),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      Text(
                        'Trường Đại học Công Thương TP.HCM',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45),
                          fontSize: 11.5,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
