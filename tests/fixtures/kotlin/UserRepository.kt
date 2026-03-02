package com.example.data

/**
 * Represents a user in the system.
 *
 * @property id Unique identifier
 * @property name Display name
 * @property email Email address
 */
data class User(
    val id: Long,
    val name: String,
    val email: String
)

/**
 * Repository for managing user data.
 */
class UserRepository(private val database: Database) {

    /**
     * Find a user by their unique ID.
     *
     * @param id The user's unique identifier.
     * @return The user if found, null otherwise.
     * @throws DatabaseException if the connection fails.
     */
    fun findById(id: Long): User? {
        return database.query("SELECT * FROM users WHERE id = ?", id)
    }

    /**
     * Save a user to the database.
     *
     * @param user The user to save.
     * @return The saved user with updated fields.
     */
    fun save(user: User): User {
        return database.insert(user)
    }

    companion object {
        /** Default page size for listings. */
        const val DEFAULT_PAGE_SIZE = 20

        /**
         * Create a repository with in-memory storage.
         * @return A new UserRepository instance.
         */
        fun inMemory(): UserRepository {
            return UserRepository(InMemoryDatabase())
        }
    }
}

/**
 * Sealed class representing the result of a user operation.
 */
sealed class UserResult {
    data class Success(val user: User) : UserResult()
    data class Error(val message: String) : UserResult()
    object Loading : UserResult()
}
