import Foundation

/// Errors that can occur during network operations.
enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingFailed
    case serverError(statusCode: Int)
}

/// A protocol for types that can handle network requests.
protocol NetworkService {
    /// Fetch data from a URL.
    /// - Parameter url: The URL to fetch from.
    /// - Returns: The fetched data.
    /// - Throws: NetworkError if the request fails.
    func fetch(from url: String) async throws -> Data
}

/// Manages network requests with caching support.
class NetworkManager: NetworkService {
    private let session: URLSession
    private var cache: [String: Data] = [:]

    /// Creates a new NetworkManager.
    /// - Parameter session: The URLSession to use. Defaults to `.shared`.
    init(session: URLSession = .shared) {
        self.session = session
    }

    /// Fetch data from a URL with caching.
    /// - Parameter url: The URL string to fetch from.
    /// - Returns: The fetched data.
    /// - Throws: NetworkError if the request fails.
    func fetch(from url: String) async throws -> Data {
        if let cached = cache[url] {
            return cached
        }

        guard let requestURL = URL(string: url) else {
            throw NetworkError.invalidURL
        }

        let (data, _) = try await session.data(from: requestURL)
        cache[url] = data
        return data
    }

    /// Decode JSON response into a Decodable type.
    /// - Parameters:
    ///   - type: The type to decode into.
    ///   - url: The URL to fetch from.
    /// - Returns: The decoded object.
    /// - Throws: NetworkError if fetching or decoding fails.
    func decode<T: Decodable>(_ type: T.Type, from url: String) async throws -> T {
        let data = try await fetch(from: url)
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            throw NetworkError.decodingFailed
        }
    }

    /// Clear the cache.
    func clearCache() {
        cache.removeAll()
    }
}

/// Response wrapper for paginated results.
struct PaginatedResponse<T: Decodable>: Decodable {
    let items: [T]
    let total: Int
    let page: Int
    let hasMore: Bool
}
