import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../application/booking_providers.dart';
import '../domain/booking.dart';
import '../domain/booking_status.dart';
import 'widgets/booking_card.dart';

enum _BookingFilter {
  all('Tất cả'),
  pending('Chờ duyệt'),
  approved('Đã duyệt'),
  inUse('Đang sử dụng'),
  completed('Hoàn thành'),
  closed('Đã khép lại');

  const _BookingFilter(this.label);
  final String label;

  bool matches(Booking booking) {
    final status = booking.status;
    return switch (this) {
      _BookingFilter.all => true,
      _BookingFilter.pending => status == BookingStatus.pending,
      _BookingFilter.approved =>
        status == BookingStatus.approved ||
            status == BookingStatus.partiallyApproved,
      _BookingFilter.inUse => status == BookingStatus.inUse,
      _BookingFilter.completed => status == BookingStatus.completed,
      _BookingFilter.closed =>
        status == BookingStatus.rejected || status == BookingStatus.cancelled,
    };
  }
}

class BookingsPage extends ConsumerStatefulWidget {
  const BookingsPage({super.key});

  @override
  ConsumerState<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends ConsumerState<BookingsPage> {
  final _searchController = TextEditingController();
  _BookingFilter _filter = _BookingFilter.all;
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(myBookingsProvider);
    await ref.read(myBookingsProvider.future);
  }

  List<Booking> _apply(List<Booking> bookings) {
    final query = _query.trim().toLowerCase();
    return bookings.where((booking) {
      if (!_filter.matches(booking)) return false;
      if (query.isEmpty) return true;
      return booking.activityName.toLowerCase().contains(query) ||
          booking.roomNames.toLowerCase().contains(query) ||
          booking.purpose.toLowerCase().contains(query) ||
          '${booking.id}'.contains(query) ||
          '#${booking.id}'.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(myBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn của tôi'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: () => ref.invalidate(myBookingsProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            bookingsAsync.maybeWhen(
              data: (bookings) => _FilterBar(
                selected: _filter,
                counts: {
                  for (final filter in _BookingFilter.values)
                    filter: bookings.where(filter.matches).length,
                },
                onSelected: (filter) => setState(() => _filter = filter),
              ),
              orElse: () => const SizedBox(height: AppSpacing.sm),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.sm),
              child: _SearchField(
                controller: _searchController,
                onChanged: (value) => setState(() => _query = value),
              ),
            ),
            Expanded(
              child: bookingsAsync.when(
                skipLoadingOnRefresh: true,
                loading: () => const ListSkeleton(count: 5, lines: 2),
                error: (error, _) => ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(myBookingsProvider),
                ),
                data: (bookings) => _BookingList(
                  bookings: _apply(bookings),
                  hasAny: bookings.isNotEmpty,
                  onRefresh: _refresh,
                  onResetFilters: () {
                    _searchController.clear();
                    setState(() {
                      _query = '';
                      _filter = _BookingFilter.all;
                    });
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selected,
    required this.counts,
    required this.onSelected,
  });

  final _BookingFilter selected;
  final Map<_BookingFilter, int> counts;
  final ValueChanged<_BookingFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        itemCount: _BookingFilter.values.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final filter = _BookingFilter.values[index];
          final count = counts[filter] ?? 0;
          final isSelected = filter == selected;
          return GestureDetector(
            onTap: () => onSelected(filter),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 13),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary
                    : Colors.white,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.line),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    filter.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.muted,
                    ),
                  ),
                  if (count > 0) ...[
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.22)
                            : AppColors.line.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.muted,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      style: const TextStyle(fontSize: 13.5, color: AppColors.navy),
      decoration: InputDecoration(
        hintText: 'Tìm theo hoạt động, phòng hoặc mã đơn',
        hintStyle: const TextStyle(fontSize: 13, color: AppColors.muted),
        prefixIcon: const Icon(Icons.search_rounded,
            size: 20, color: AppColors.muted),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                tooltip: 'Xóa tìm kiếm',
                icon: const Icon(Icons.close_rounded,
                    size: 18, color: AppColors.muted),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              ),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(vertical: 12),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  const _BookingList({
    required this.bookings,
    required this.hasAny,
    required this.onRefresh,
    required this.onResetFilters,
  });

  final List<Booking> bookings;
  final bool hasAny;
  final Future<void> Function() onRefresh;
  final VoidCallback onResetFilters;

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
            hasAny
                ? EmptyState(
                    icon: Icons.filter_alt_off_outlined,
                    message: 'Không có đơn phù hợp',
                    description: 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.',
                    actionLabel: 'Xóa bộ lọc',
                    onAction: onResetFilters,
                  )
                : EmptyState(
                    icon: Icons.event_available_outlined,
                    message: 'Chưa có đơn đặt phòng',
                    description:
                        'Các đơn bạn gửi sẽ xuất hiện tại đây để theo dõi trạng thái duyệt.',
                    actionLabel: 'Đặt phòng ngay',
                    onAction: () => context.push('/booking/new'),
                  ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, 96),
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        itemCount: bookings.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, index) {
          final booking = bookings[index];
          return BookingCard(
            booking: booking,
            onTap: () => context.push('/bookings/${booking.id}'),
          )
              .animate()
              .fadeIn(
                  delay: Duration(milliseconds: 30 * (index % 8)),
                  duration: const Duration(milliseconds: 240))
              .slideY(
                  begin: 0.04,
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOut);
        },
      ),
    );
  }
}
