using Amarna.Engine;

namespace Amarna.Game;

/// <summary>A seat fed by the UI: the runner waits until the person submits orders or answers an envoy.</summary>
public sealed class HumanSeat : ISeat
{
    private TaskCompletionSource<TurnSubmission>? _orders;
    private TaskCompletionSource<HostReply>? _audience;

    public HumanSeat(Power power) => Power = power;

    public Power Power { get; }
    public string Label => "Human";

    public SeatView? PendingOrders { get; private set; }
    public AudienceView? PendingAudience { get; private set; }
    public SeatView? AudienceCourt { get; private set; }

    public event Action? Changed;

    public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        PendingOrders = view;
        _orders = new TaskCompletionSource<TurnSubmission>(TaskCreationOptions.RunContinuationsAsynchronously);
        ct.Register(() => _orders?.TrySetCanceled());
        Changed?.Invoke();
        return _orders.Task;
    }

    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        PendingAudience = view;
        AudienceCourt = court;
        _audience = new TaskCompletionSource<HostReply>(TaskCreationOptions.RunContinuationsAsynchronously);
        ct.Register(() => _audience?.TrySetCanceled());
        Changed?.Invoke();
        return _audience.Task;
    }

    public void SubmitOrders(TurnSubmission submission)
    {
        var tcs = _orders;
        _orders = null;
        PendingOrders = null;
        Changed?.Invoke();
        tcs?.TrySetResult(submission);
    }

    public void Answer(HostReply reply)
    {
        var tcs = _audience;
        _audience = null;
        PendingAudience = null;
        AudienceCourt = null;
        Changed?.Invoke();
        tcs?.TrySetResult(reply);
    }
}
