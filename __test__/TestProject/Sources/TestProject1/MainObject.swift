/// This is an examplatory enumeration.
public enum SomeEnum: Equatable {
    case a, b, c

    /// Returns whether self is equal to `.b`.
    public var isB: Bool { self == .b }
}

/// This is an examplatory final class.
public final class SomeClass {
    /// Simply creates a new instance of this class.
    public init() {}

    /// This prints 'Hello'.
    public func sayHello() { print("Hello") }
}
