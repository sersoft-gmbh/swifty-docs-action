/// This is an examplatory enumeration.
public enum SomeEnum: Equatable {
    /// This is case A.
    case a
    /// This is case B.
    case b
    /// This is case C.
    case c

    /// Returns whether self is equal to ``b``.
    public var isB: Bool { self == .b }
}

/// This is an examplatory final class.
public final class SomeClass {
    /// Simply creates a new instance of this class.
    public init() {}

    /// This prints 'Hello'.
    public func sayHello() { print("Hello") }
}
