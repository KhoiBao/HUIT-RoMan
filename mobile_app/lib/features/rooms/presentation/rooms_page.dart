import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_sheet.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../application/rooms_providers.dart';
import '../domain/room.dart';
import 'widgets/room_card.dart';

class RoomFilters {
  const RoomFilters({this.building, this.roomType, this.floor, this.status});
  final String? building;
  final String? roomType;
  final String? floor;
  final RoomStatus? status;

  bool get isEmpty =>
      building == null && roomType == null && floor == null && status == null;
}

class RoomsPage extends ConsumerStatefulWidget {
  const RoomsPage({super.key, this.initialType});

  final String? initialType;

  @override
  ConsumerState<RoomsPage> createState() => _RoomsPageState();
}

class _RoomsPageState extends ConsumerState<RoomsPage> {
  final _search = TextEditingController();
  RoomFilters _filters = const RoomFilters();

  @override
  void initState() {
    super.initState();
    if (widget.initialType != null) {
      _filters = RoomFilters(roomType: widget.initialType);
    }
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Room> _apply(List<Room> rooms) {
    final q = _search.text.trim().toLowerCase();
    return rooms.where((room) {
      final matchesQuery = q.isEmpty ||
          room.name.toLowerCase().contains(q) ||
          room.roomCode.toLowerCase().contains(q);
      final matchesStatus =
          _filters.status == null || room.status == _filters.status;
      final matchesBuilding = _filters.building == null ||
          room.building == _filters.building;
      final matchesType =
          _filters.roomType == null || room.roomTypeName == _filters.roomType;
      final matchesFloor =
          _filters.floor == null || room.floor == _filters.floor;
      return matchesQuery &&
          matchesStatus &&
          matchesBuilding &&
          matchesType &&
          matchesFloor;
    }).toList();
  }

  Future<void> _openFilters(List<Room> rooms) async {
    final result = await showAppSheet<RoomFilters>(
      context,
      builder: (ctx) => _FilterSheet(rooms: rooms, current: _filters),
    );
    if (result != null) setState(() => _filters = result);
  }

  @override
  Widget build(BuildContext context) {
    final roomsAsync = ref.watch(roomsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Danh sách phòng'),
        actions: [
          IconButton(
            tooltip: 'Bộ lọc',
            onPressed: roomsAsync.maybeWhen(
              data: (rooms) => () => _openFilters(rooms),
              orElse: () => null,
            ),
            icon: Badge(
              isLabelVisible: !_filters.isEmpty,
              backgroundColor: AppColors.primary,
              child: const Icon(Icons.tune_rounded),
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.sm),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Tìm theo tên hoặc mã phòng',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () {
                            _search.clear();
                            setState(() {});
                          },
                        ),
                ),
              ),
            ),
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                children: [
                  _StatusPill(
                    label: 'Tất cả',
                    selected: _filters.status == null,
                    onTap: () => setState(
                        () => _filters = RoomFilters(building: _filters.building, roomType: _filters.roomType, floor: _filters.floor)),
                  ),
                  for (final status in RoomStatus.values) ...[
                    const SizedBox(width: AppSpacing.sm),
                    _StatusPill(
                      label: status.label,
                      selected: _filters.status == status,
                      onTap: () => setState(() => _filters = RoomFilters(
                            building: _filters.building,
                            roomType: _filters.roomType,
                            floor: _filters.floor,
                            status: _filters.status == status ? null : status,
                          )),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: roomsAsync.when(
                skipLoadingOnRefresh: true,
                loading: () => const ListSkeleton(count: 5, lines: 2),
                error: (error, _) => ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(roomsProvider),
                ),
                data: (rooms) {
                  final filtered = _apply(rooms);
                  if (filtered.isEmpty) {
                    return const EmptyState(
                      icon: Icons.meeting_room_outlined,
                      message: 'Không tìm thấy phòng phù hợp',
                      description: 'Thử đổi từ khóa hoặc bộ lọc.',
                    );
                  }
                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {
                      ref.invalidate(roomsProvider);
                      await ref.read(roomsProvider.future);
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.xxl),
                      physics: const AlwaysScrollableScrollPhysics(
                          parent: BouncingScrollPhysics()),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.md),
                      itemBuilder: (context, index) {
                        final room = filtered[index];
                        return RoomCard(
                          room: room,
                          onTap: () => context.push('/rooms/${room.id}'),
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
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.muted,
          ),
        ),
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.rooms, required this.current});
  final List<Room> rooms;
  final RoomFilters current;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  String? _building;
  String? _type;
  String? _floor;

  @override
  void initState() {
    super.initState();
    _building = widget.current.building;
    _type = widget.current.roomType;
    _floor = widget.current.floor;
  }

  List<String> get _buildings =>
      widget.rooms.map((r) => r.building).where((e) => e.isNotEmpty).toSet().toList()..sort();

  List<String> get _types =>
      widget.rooms.map((r) => r.roomTypeName).where((e) => e.isNotEmpty).toSet().toList()..sort();

  List<String> get _floors => widget.rooms
      .where((r) => _building == null || r.building == _building)
      .map((r) => r.floor)
      .where((e) => e.isNotEmpty)
      .toSet()
      .toList()
    ..sort();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SheetHeader(title: 'Bộ lọc phòng'),
            _label('Tòa nhà'),
            _chips(_buildings, _building, (value) => setState(() {
                  _building = value;
                  _floor = null;
                })),
            const SizedBox(height: AppSpacing.lg),
            _label('Loại phòng'),
            _chips(_types, _type, (value) => setState(() => _type = value)),
            const SizedBox(height: AppSpacing.lg),
            _label('Tầng'),
            _chips(_floors, _floor, (value) => setState(() => _floor = value)),
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _building = null;
                      _type = null;
                      _floor = null;
                    }),
                    child: const Text('Đặt lại'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(RoomFilters(
                      building: _building,
                      roomType: _type,
                      floor: _floor,
                      status: widget.current.status,
                    )),
                    child: const Text('Áp dụng'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.navy,
          ),
        ),
      );

  Widget _chips(List<String> values, String? selected, ValueChanged<String?> onSelect) {
    if (values.isEmpty) {
      return const Text('Không có lựa chọn',
          style: TextStyle(fontSize: 12, color: AppColors.muted));
    }
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final value in values)
          ChoiceChip(
            label: Text(value),
            selected: selected == value,
            onSelected: (_) => onSelect(selected == value ? null : value),
            selectedColor: AppColors.primary.withValues(alpha: 0.12),
            labelStyle: TextStyle(
              fontSize: 12.5,
              color: selected == value ? AppColors.primary : AppColors.navy,
            ),
            showCheckmark: false,
          ),
      ],
    );
  }
}
