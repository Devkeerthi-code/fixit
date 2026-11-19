package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;

import com.fixit.auth.RefreshToken;
import com.fixit.user.AppUser;
import jakarta.persistence.Column;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

/**
 * Guards the two columns whose SQL type isn't the JPA default. With ddl-auto=validate a mismatch
 * stops the app from starting, and the integration tests only catch it where Docker is available.
 */
class EntityColumnTypesTest {

    @Test
    void emailIsCaseInsensitiveCitextLikeTheMigration() throws NoSuchFieldException {
        Column column = AppUser.class.getDeclaredField("email").getAnnotation(Column.class);

        assertThat(column.columnDefinition()).isEqualTo("citext");
    }

    @Test
    void refreshTokenHashIsAFixedWidthChar64() throws NoSuchFieldException {
        var field = RefreshToken.class.getDeclaredField("tokenHash");

        assertThat(field.getAnnotation(JdbcTypeCode.class).value()).isEqualTo(SqlTypes.CHAR);
        assertThat(field.getAnnotation(Column.class).length()).isEqualTo(64);
    }
}
