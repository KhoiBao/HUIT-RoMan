import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../auth/application/auth_controller.dart';
import '../domain/booking.dart';
import '../domain/booking_repository.dart';
import '../domain/booking_rules.dart';
import '../domain/clock_time.dart';
import 'booking_providers.dart';

class BookingPrefill {
  const BookingPrefill({this.roomId, this.date, this.start, this.end});

  final int? roomId;
  final DateTime? date;
  final ClockTime? start;
  final ClockTime? end;

  factory BookingPrefill.fromQuery(Map<String, String> query) {
    final rawDate = query['date'];
    final date = rawDate == null ? null : DateTime.tryParse(rawDate);
    return BookingPrefill(
      roomId: int.tryParse(query['roomId'] ?? ''),
      date: date == null ? null : DateTime(date.year, date.month, date.day),
      start: ClockTime.tryParse(query['start']),
      end: ClockTime.tryParse(query['end']),
    );
  }
}

class BookingCreateState {
  const BookingCreateState({
    this.step = 0,
    required this.date,
    this.mode = BookingMode.hourly,
    this.startTime = const ClockTime(8, 0),
    this.endTime = const ClockTime(10, 0),
    this.startPeriod,
    this.endPeriod,
    this.periodGroups = const [],
    this.periodRoomTypeId,
    this.loadingPeriods = false,
    this.rooms = const [],
    this.loadingRooms = false,
    this.roomsError = '',
    this.notice = '',
    this.selectedRoomIds = const {},
    this.activityName = '',
    this.purpose = '',
    this.guestCount = 1,
    this.note = '',
    this.isStudent = false,
    this.eligibility,
    this.loadingEligibility = false,
    this.dateError = '',
    this.timeError = '',
    this.formError = '',
    this.submitting = false,
    this.submitError = '',
    this.created,
    this.initialRoomId,
  });

  final int step;
  final DateTime date;
  final BookingMode mode;
  final ClockTime startTime;
  final ClockTime endTime;
  final Period? startPeriod;
  final Period? endPeriod;
  final List<PeriodGroup> periodGroups;
  final int? periodRoomTypeId;
  final bool loadingPeriods;
  final List<AvailableRoom> rooms;
  final bool loadingRooms;
  final String roomsError;
  final String notice;
  final Set<int> selectedRoomIds;
  final String activityName;
  final String purpose;
  final int guestCount;
  final String note;
  final bool isStudent;
  final BookingEligibility? eligibility;
  final bool loadingEligibility;
  final String dateError;
  final String timeError;
  final String formError;
  final bool submitting;
  final String submitError;
  final Booking? created;
  final int? initialRoomId;

  List<AvailableRoom> get selectedRooms =>
      rooms.where((r) => selectedRoomIds.contains(r.id)).toList();

  List<Period> get periodsInGroup {
    for (final group in periodGroups) {
      if (group.roomTypeId == periodRoomTypeId) return group.periods;
    }
    return const [];
  }

  List<Period> get endPeriodOptions {
    final start = startPeriod;
    if (start == null) return periodsInGroup;
    return periodsInGroup.where((p) => p.start >= start.start).toList();
  }

  int get maxCapacity {
    final selected = selectedRooms;
    if (selected.isEmpty) return 999;
    return selected.map((r) => r.capacity).reduce((a, b) => a < b ? a : b);
  }

  String get modeLabel =>
      mode == BookingMode.period ? 'Theo tiết học' : 'Theo khung giờ';

  String get timeLabel {
    if (mode == BookingMode.period) {
      if (startPeriod == null || endPeriod == null) return 'Chưa chọn tiết';
      return '${startPeriod!.name} – ${endPeriod!.name}';
    }
    return '${startTime.label} – ${endTime.label}';
  }

  BookingCreateState copyWith({
    int? step,
    DateTime? date,
    BookingMode? mode,
    ClockTime? startTime,
    ClockTime? endTime,
    Object? startPeriod = _unset,
    Object? endPeriod = _unset,
    List<PeriodGroup>? periodGroups,
    Object? periodRoomTypeId = _unset,
    bool? loadingPeriods,
    List<AvailableRoom>? rooms,
    bool? loadingRooms,
    String? roomsError,
    String? notice,
    Set<int>? selectedRoomIds,
    String? activityName,
    String? purpose,
    int? guestCount,
    String? note,
    bool? isStudent,
    Object? eligibility = _unset,
    bool? loadingEligibility,
    String? dateError,
    String? timeError,
    String? formError,
    bool? submitting,
    String? submitError,
    Object? created = _unset,
    Object? initialRoomId = _unset,
    bool clearPeriods = false,
  }) {
    return BookingCreateState(
      step: step ?? this.step,
      date: date ?? this.date,
      mode: mode ?? this.mode,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      startPeriod:
          clearPeriods ? null : (identical(startPeriod, _unset) ? this.startPeriod : startPeriod as Period?),
      endPeriod:
          clearPeriods ? null : (identical(endPeriod, _unset) ? this.endPeriod : endPeriod as Period?),
      periodGroups: periodGroups ?? this.periodGroups,
      periodRoomTypeId: identical(periodRoomTypeId, _unset)
          ? this.periodRoomTypeId
          : periodRoomTypeId as int?,
      loadingPeriods: loadingPeriods ?? this.loadingPeriods,
      rooms: rooms ?? this.rooms,
      loadingRooms: loadingRooms ?? this.loadingRooms,
      roomsError: roomsError ?? this.roomsError,
      notice: notice ?? this.notice,
      selectedRoomIds: selectedRoomIds ?? this.selectedRoomIds,
      activityName: activityName ?? this.activityName,
      purpose: purpose ?? this.purpose,
      guestCount: guestCount ?? this.guestCount,
      note: note ?? this.note,
      isStudent: isStudent ?? this.isStudent,
      eligibility: identical(eligibility, _unset)
          ? this.eligibility
          : eligibility as BookingEligibility?,
      loadingEligibility: loadingEligibility ?? this.loadingEligibility,
      dateError: dateError ?? this.dateError,
      timeError: timeError ?? this.timeError,
      formError: formError ?? this.formError,
      submitting: submitting ?? this.submitting,
      submitError: submitError ?? this.submitError,
      created: identical(created, _unset) ? this.created : created as Booking?,
      initialRoomId: identical(initialRoomId, _unset)
          ? this.initialRoomId
          : initialRoomId as int?,
    );
  }

  static const _unset = Object();

  factory BookingCreateState.initial() {
    final defaults = _defaults();
    return BookingCreateState(
      date: defaults.$1,
      startTime: defaults.$2,
      endTime: defaults.$3,
    );
  }

  static (DateTime, ClockTime, ClockTime) _defaults() {
    final now =
        DateTime.now().toUtc().add(const Duration(hours: 7));
    var date = DateTime(now.year, now.month, now.day);
    var startHour = now.hour + (now.minute > 0 ? 1 : 0);
    if (startHour < 7) startHour = 7;
    if (startHour + 2 > 20) {
      date = date.add(const Duration(days: 1));
      startHour = 8;
    }
    while (date.weekday == DateTime.sunday) {
      date = date.add(const Duration(days: 1));
    }
    return (date, ClockTime(startHour, 0), ClockTime(startHour + 2, 0));
  }
}

final bookingCreateControllerProvider = NotifierProvider.autoDispose<
    BookingCreateController, BookingCreateState>(BookingCreateController.new);

class BookingCreateController extends Notifier<BookingCreateState> {
  bool _initialized = false;
  bool _disposed = false;

  BookingRepository get _repository => ref.read(bookingRepositoryProvider);

  @override
  BookingCreateState build() {
    ref.onDispose(() => _disposed = true);
    return BookingCreateState.initial();
  }

  void init(BookingPrefill prefill) {
    if (_initialized) return;
    _initialized = true;

    final role = ref.read(authControllerProvider).user?.role;
    var date = state.date;
    var start = state.startTime;
    var end = state.endTime;
    if (prefill.date != null) {
      date = prefill.date!;
      start = prefill.start ?? const ClockTime(8, 0);
      end = prefill.end ?? start.addMinutes(60);
      if (end <= start) end = start.addMinutes(60);
    }

    state = state.copyWith(
      date: date,
      startTime: start,
      endTime: end,
      isStudent: role?.isStudent ?? false,
      initialRoomId: prefill.roomId,
    );
    loadEligibility();
  }

  Future<void> loadEligibility() async {
    state = state.copyWith(loadingEligibility: true);
    try {
      final eligibility = await _repository.eligibility();
      if (_disposed) return;
      state = state.copyWith(
          eligibility: eligibility, loadingEligibility: false);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(loadingEligibility: false);
    }
  }

  Future<void> loadPeriods() async {
    if (state.loadingPeriods) return;
    state = state.copyWith(loadingPeriods: true, timeError: '');
    try {
      final periods = await _repository.periods();
      if (_disposed) return;
      final groups = PeriodGroup.fromPeriods(periods);
      state = state.copyWith(
        periodGroups: groups,
        loadingPeriods: false,
      );
      if (groups.isNotEmpty && state.periodRoomTypeId == null) {
        selectPeriodGroup(groups.first.roomTypeId);
      }
    } on AppException catch (error) {
      if (_disposed) return;
      state = state.copyWith(loadingPeriods: false, timeError: error.message);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(
          loadingPeriods: false, timeError: 'Không tải được danh sách tiết học.');
    }
  }

  void setStep(int step) {
    if (step < 0 || step > 2) return;
    state = state.copyWith(step: step);
  }

  void next() {
    if (state.step == 0) {
      if (!_validateTime()) return;
      final eligibility = state.eligibility;
      if (eligibility != null && !eligibility.isEligible) {
        state = state.copyWith(
          timeError: eligibility.message.isEmpty
              ? 'Tài khoản của bạn hiện không được phép mượn phòng.'
              : eligibility.message,
        );
        return;
      }
      state = state.copyWith(step: 1, roomsError: '', notice: '');
      loadRooms();
    } else if (state.step == 1) {
      if (state.selectedRoomIds.isEmpty) {
        state = state.copyWith(roomsError: 'Vui lòng chọn ít nhất một phòng.');
        return;
      }
      state = state.copyWith(step: 2, formError: '');
    }
  }

  void back() {
    if (state.step > 0) state = state.copyWith(step: state.step - 1);
  }

  bool _validateTime() {
    final advanceError = BookingRules.validateAdvance(state.date);
    if (advanceError != null) {
      state = state.copyWith(dateError: advanceError, timeError: '');
      return false;
    }

    String? error;
    if (state.mode == BookingMode.period) {
      if (state.startPeriod == null || state.endPeriod == null) {
        error = 'Vui lòng chọn tiết bắt đầu và tiết kết thúc.';
      } else if (state.endPeriod!.start < state.startPeriod!.start) {
        error = 'Tiết kết thúc phải sau tiết bắt đầu.';
      } else if (state.startPeriod!.end > BookingRules.closeTime) {
        error = 'Thời gian đặt phòng nằm ngoài giờ phục vụ 07:00 – 20:00.';
      }
    } else if (state.isStudent) {
      error = BookingRules.validateStudentWindow(
          state.date, state.startTime, state.endTime);
    } else {
      error = BookingRules.validateLecturerWindow(
          state.date, state.startTime, state.endTime);
    }

    if (error == null) {
      state = state.copyWith(dateError: '', timeError: '');
      return true;
    }
    final looksLikeDate = error.contains('Chủ Nhật') ||
        error.contains('2 tuần') ||
        error.contains('quá khứ');
    state = state.copyWith(
      dateError: looksLikeDate ? error : '',
      timeError: looksLikeDate ? '' : error,
    );
    return false;
  }

  void setDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    if (normalized == state.date) return;
    state = state.copyWith(
      date: normalized,
      dateError: '',
      timeError: '',
      rooms: const [],
      selectedRoomIds: const {},
      roomsError: '',
      notice: '',
    );
  }

  void setMode(BookingMode mode) {
    if (state.isStudent && mode == BookingMode.period) return;
    if (mode == state.mode) return;
    state = state.copyWith(
      mode: mode,
      clearPeriods: mode == BookingMode.hourly,
      dateError: '',
      timeError: '',
      rooms: const [],
      selectedRoomIds: const {},
      roomsError: '',
      notice: '',
    );
    if (mode == BookingMode.period && state.periodGroups.isEmpty) {
      loadPeriods();
    }
  }

  void setStartTime(ClockTime time) {
    var end = state.endTime;
    if (end <= time) {
      end = time.addMinutes(60);
      if (end > BookingRules.closeTime) end = BookingRules.closeTime;
    }
    state = state.copyWith(startTime: time, endTime: end, timeError: '');
  }

  void setEndTime(ClockTime time) {
    state = state.copyWith(endTime: time, timeError: '');
  }

  void selectPeriodGroup(int roomTypeId) {
    PeriodGroup? group;
    for (final candidate in state.periodGroups) {
      if (candidate.roomTypeId == roomTypeId) {
        group = candidate;
        break;
      }
    }
    if (group == null || group.periods.isEmpty) return;
    final start = group.periods.first;
    final end = group.periods.length > 1 ? group.periods[1] : start;
    state = state.copyWith(
      periodRoomTypeId: roomTypeId,
      startPeriod: start,
      endPeriod: end,
      timeError: '',
      rooms: const [],
      selectedRoomIds: const {},
      roomsError: '',
      notice: '',
    );
  }

  void setStartPeriod(Period period) {
    var end = state.endPeriod;
    if (end == null || end.start < period.start) end = period;
    state = state.copyWith(startPeriod: period, endPeriod: end, timeError: '');
  }

  void setEndPeriod(Period period) {
    state = state.copyWith(endPeriod: period, timeError: '');
  }

  Future<void> loadRooms() async {
    final query = _query();
    if (query == null) {
      state = state.copyWith(
          roomsError: 'Vui lòng chọn thời gian đặt phòng hợp lệ.');
      return;
    }
    state = state.copyWith(loadingRooms: true, roomsError: '', notice: '');
    try {
      final rooms = await _repository.availableRooms(query);
      if (_disposed) return;
      final initial = state.initialRoomId;
      final selected = <int>{};
      var notice = '';
      if (initial != null) {
        if (rooms.any((r) => r.id == initial)) {
          selected.add(initial);
        } else {
          notice =
              'Phòng bạn chọn không còn trống trong khung giờ này. Vui lòng chọn phòng khác.';
        }
      }
      state = state.copyWith(
        rooms: rooms,
        loadingRooms: false,
        selectedRoomIds: selected,
        notice: notice,
        initialRoomId: null,
      );
    } on AppException catch (error) {
      if (_disposed) return;
      state = state.copyWith(loadingRooms: false, roomsError: error.message);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(
          loadingRooms: false,
          roomsError: 'Không tải được danh sách phòng trống.');
    }
  }

  AvailabilityQuery? _query() {
    if (state.mode == BookingMode.period) {
      final start = state.startPeriod;
      final end = state.endPeriod;
      if (start == null || end == null) return null;
      return AvailabilityQuery(
        date: state.date,
        mode: BookingMode.period,
        startPeriodId: start.id,
        endPeriodId: end.id,
      );
    }
    return AvailabilityQuery(
      date: state.date,
      mode: BookingMode.hourly,
      startTime: state.startTime,
      endTime: state.endTime,
    );
  }

  void toggleRoom(int roomId) {
    final selected = {...state.selectedRoomIds};
    if (!selected.remove(roomId)) selected.add(roomId);
    state = state.copyWith(selectedRoomIds: selected, roomsError: '');
  }

  void setActivityName(String value) {
    state = state.copyWith(activityName: value, formError: '');
  }

  void setPurpose(String value) {
    state = state.copyWith(purpose: value, formError: '');
  }

  void setGuestCount(int value) {
    state = state.copyWith(guestCount: value, formError: '');
  }

  void setNote(String value) {
    state = state.copyWith(note: value);
  }

  Future<Booking?> submit() async {
    if (state.submitting) return null;
    final error = _validateForm();
    if (error != null) {
      state = state.copyWith(formError: error, submitError: '');
      return null;
    }
    final eligibility = state.eligibility;
    if (eligibility != null && !eligibility.isEligible) {
      state = state.copyWith(
        submitError: eligibility.message.isEmpty
            ? 'Tài khoản của bạn hiện không được phép mượn phòng.'
            : eligibility.message,
      );
      return null;
    }

    final draft = BookingDraft(
      date: state.date,
      mode: state.mode,
      startTime: state.startTime,
      endTime: state.endTime,
      startPeriod: state.startPeriod,
      endPeriod: state.endPeriod,
      rooms: state.selectedRooms,
      activityName: state.activityName,
      purpose: state.purpose,
      guestCount: state.guestCount,
      note: state.note,
    );

    state = state.copyWith(submitting: true, submitError: '', formError: '');
    try {
      final booking = await _repository.create(draft);
      if (_disposed) return booking;
      state = state.copyWith(submitting: false, created: booking);
      return booking;
    } on AppException catch (error) {
      if (_disposed) return null;
      state = state.copyWith(submitting: false, submitError: error.message);
      return null;
    } catch (_) {
      if (_disposed) return null;
      state = state.copyWith(
          submitting: false,
          submitError: 'Không gửi được đơn đặt phòng. Vui lòng thử lại.');
      return null;
    }
  }

  String? _validateForm() {
    if (state.activityName.trim().length < 3) {
      return 'Tên hoạt động phải từ 3 ký tự trở lên.';
    }
    if (state.purpose.trim().length < 3) {
      return 'Vui lòng nhập mục đích sử dụng phòng.';
    }
    if (state.guestCount < 1) {
      return 'Số lượng người tham gia phải lớn hơn 0.';
    }
    if (state.selectedRooms.isNotEmpty &&
        state.guestCount > state.maxCapacity) {
      return 'Số lượng người vượt quá sức chứa của phòng đã chọn (tối đa ${state.maxCapacity} người).';
    }
    if (state.selectedRoomIds.isEmpty) {
      return 'Vui lòng chọn ít nhất một phòng.';
    }
    return null;
  }

  void clearSubmitError() => state = state.copyWith(submitError: '');
}
